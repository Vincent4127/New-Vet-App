import { ObjectId } from "mongodb";
import bcrypt from 'bcrypt';
import express, { application } from "express";
import multer from "multer";
import path from "path";

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "profile_" + unique + path.extname(file.originalname));
    },
});
const profileUpload = multer({
    storage: profileStorage,
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only image files allowed"), false);
    },
    limits: { fileSize: 3 * 1024 * 1024 },
});
import { sendPushToToken } from "../pushService.js";

export default function userRoutes(users) {
    const router = express.Router();

    // get all users
    router.get("/", async (req, res) => {
        try {
            const list = await users.find({}).sort({ username: 1 }).toArray();
            res.json(list);
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });



    // sign in validation
    router.post("/signIn", async (req, res) => {
        try {
            const { email, password } = req.body;
            console.log(req.body)
            if (!email || !password) return res.status(400).json({ error: "All fields are required" });
            const user = await users.findOne({ email });
            if (!user) return res.status(404).json({ error: "User not found" });
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return res.status(401).json({ error: "Invalid password" });
            const normalizedRole = (user.role || 'normal').toLowerCase();
            res.status(200).json({
                success: true, user: {
                    _id: user._id, username: user.username, email: user.email,
                    role: normalizedRole, profilePic: user.profilePic || null
                }
            })
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // sign up validation
    router.post("/signUp", async (req, res) => {
        try {
            const { username, email, password, phone, confirmPass } = req.body;
            console.log(req.body)
            const appointment = { hour: "", minutes: "", day: "", month: "", year: "" };
            const userPets = [];
            const role = "normal";
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!username || !email || !password || !phone || !confirmPass) return res.status(400).json({ error: "All fields are required" });
            const usernameExists = await users.findOne({ username });
            if (usernameExists) return res.status(400).json({ error: "Username Already Exists" });

            if (phone.length != 8) return res.status(400).json({ error: "Phone number must be 8 characters" });
            const phoneExists = await users.findOne({ phone });
            if (phoneExists) return res.status(400).json({ error: "Phone number Already Exists" });

            const emailValid = regex.test(email);
            if (!emailValid) return res.status(400).json({ error: "Invalid email address" });
            const emailExists = await users.findOne({ email });
            if (emailExists) return res.status(400).json({ error: "Email Already Exists" });

            if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
            if (confirmPass != password) return res.status(400).json({ error: "Confirm password and password must be the same" });
            const hashedpassword = await bcrypt.hash(password, 10);

            const newUser = { username: username, email: email, password: hashedpassword, phone: phone, appointment: appointment, userPets: userPets, role: role };
            await users.insertOne(newUser);
            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }

    });

    // delete user
    router.delete("/delete/:id", async (req, res) => {
        try {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);
            const exists = await users.findOne({ _id: userId });
            if (!exists) return res.status(404).json({ error: "User not found" });
            users.deleteOne({ _id: userId });
            res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }

    });

    // update user info
    router.put("/updateInfo/:id", async (req, res) => {
        try {
            const { newEmail, newPassword, confirmPass, newPhone, newUsername } = req.body;
            const { id } = req.params;
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);
            const exists = await users.findOne({ _id: userId });
            if (!exists) return res.status(404).json({ error: "User not found" });

            if (newEmail) {
                const emailValid = regex.test(newEmail);
                if (!emailValid) return res.status(400).json({ error: "Invalid email address" });
                const emailExists = await users.findOne({ email: newEmail, _id: { $ne: userId } });
                if (emailExists) return res.status(400).json({ error: "Email Already Exists" });
                await users.findOneAndUpdate(
                    { _id: userId },
                    { $set: { email: newEmail } },
                    { returnDocument: "after" }
                );
            }

            if (newPassword) {
                if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
                if (confirmPass != newPassword) return res.status(400).json({ error: "Confirm password and password must be the same" });
                const newPass = await bcrypt.hash(newPassword, 10);
                await users.findOneAndUpdate(
                    { _id: userId },
                    { $set: { password: newPass } },
                    { returnDocument: "after" }
                );
            }

            if (newPhone) {
                if (newPhone.length != 8) return res.status(400).json({ error: "Phone number must be 8 characters" });
                const phoneExists = await users.findOne({ phone: newPhone, _id: { $ne: userId } });
                if (phoneExists) return res.status(400).json({ error: "Phone number Already Exists" });
                await users.findOneAndUpdate(
                    { _id: userId },
                    { $set: { phone: newPhone } },
                    { returnDocument: "after" }
                );
            }

            if (newUsername) {
                const exists = await users.findOne({ username: newUsername, _id: { $ne: userId } });
                if (exists) return res.status(400).json({ error: "Username already used" });
                await users.findOneAndUpdate(
                    { _id: userId },
                    { $set: { username: newUsername } },
                    { returnDocument: "after" }
                );
            }

            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // schedule an appointment
    router.put("/scheduleAppointment/:id", async (req, res) => {
        try {
            const { hour, minutes, day, month, year } = req.body;
            const { id } = req.params;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid user id" });
            const userId = new ObjectId(id);
            const exists = await users.findOne({ _id: userId });
            if (!exists) return res.status(404).json({ error: "User not found" });

            if (!hour || !day || !month || !year) return res.status(400).json({ error: "All fields are required" });
            if (hour < 0 || hour > 23) return res.status(400).json({ error: "Invalid Hour" });
            if (minutes < 0 || minutes > 59) return res.status(400).json({ error: "Invalid Minutes" });
            if (day < 1 || day > 31) return res.status(400).json({ error: "Invalid Day" });
            if (month < 1 || month > 12) return res.status(400).json({ error: "Invalid Month" });

            // Reject appointments in the past, using the server's current date as reference.
            // Compared at minute granularity so "right now" is still allowed.
            const requested = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minutes || 0), 0, 0);
            if (isNaN(requested.getTime())) return res.status(400).json({ error: "Invalid date" });
            const now = new Date();
            now.setSeconds(0, 0);
            if (requested.getTime() < now.getTime()) return res.status(400).json({ error: "Appointment cannot be in the past" });

            // Clinic opening hours: Mon–Fri 8:00–18:00, Sat 9:00–14:00, Sun closed.
            const dow = requested.getDay(); // 0 = Sunday ... 6 = Saturday
            let openMin, closeMin;
            if (dow === 0) {
                return res.status(400).json({ error: "The clinic is closed on Sundays" });
            } else if (dow === 6) {
                openMin = 9 * 60; closeMin = 14 * 60;
            } else {
                openMin = 8 * 60; closeMin = 18 * 60;
            }
            const reqMin = Number(hour) * 60 + Number(minutes || 0);
            if (reqMin < openMin || reqMin > closeMin) {
                return res.status(400).json({ error: "Appointment must be within clinic hours (Mon-Fri 8:00-18:00, Sat 9:00-14:00)" });
            }

            const newAppointment = { hour: hour, minutes: minutes, day: day, month: month, year: year };
            const taken = await users.findOne({
                "appointment.day": day,
                "appointment.month": month,
                "appointment.year": year,
                "appointment.hour": hour,
                "appointment.minutes": minutes
            });
            if (taken) return res.status(409).json({ error: "Appointment is already taken" });
            await users.findOneAndUpdate({ _id: userId }, { $set: { appointment: newAppointment } }, { returnDocument: "after" });
            const user = await users.findOne({ _id: userId });

            if (user?.fcmToken) {
                await sendPushToToken(user.fcmToken, {
                    title: "Appointment booked",
                    body: `Your appointment is set for ${day}/${month}/${year} at ${hour}:${String(minutes).padStart(2, "0")}`,
                    data: { type: "APPOINTMENT_BOOKED" },
                });
            }

            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // cancel an appointment
    router.put("/cancelAppointment/:id", async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid user id" });
            const userId = new ObjectId(id);
            const user = await users.findOne({ _id: userId });
            if (!user) return res.status(404).json({ error: "User not found" });

            if (!user.appointment.day) return res.status(400).json({ error: "No Assigned Appointments" });

            const newAppointment = { day: "", month: "", year: "", hour: "", minutes: "" };
            await users.findOneAndUpdate({ _id: userId }, { $set: { appointment: newAppointment } }, { returnDocument: "after" });
            return res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    router.get("/userAppointments/:id", async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);

            const user = await users.findOne({ _id: userId });
            if (!user) return res.status(404).json({ error: "User Not Found" });

            res.status(200).json(user.appointment);

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    router.get("/AllAppointments", async (req, res) => {
        try {
            const list = await users.find({}).toArray()
            const AllAppointments = [];

            list.forEach(element => {
                if (element.appointment.day)
                    AllAppointments.push(element.appointment)
            });

            res.status(200).json(AllAppointments);
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });


    router.get("/userPets/:id", async (req, res) => {
        try {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);
            const user = await users.findOne({ _id: userId });
            if (!user) return res.status(404).json({ error: "User Not Found" });

            if (!user.userPets || user.userPets.length === 0) return res.status(404).json({ error: "No pets found" });

            res.status(200).json(user.userPets);

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    router.put("/fcm-token/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const { fcmToken } = req.body;
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);
            const user = await users.findOne({ _id: userId });
            if (!user) return res.status(404).json({ error: "User Not Found" });
            await users.updateOne({ _id: userId }, { $set: { fcmToken: fcmToken } });
            res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // upload user profile picture
    router.post("/uploadProfilePic/:id", profileUpload.single("profilePic"), async (req, res) => {
        try {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);
            const exists = await users.findOne({ _id: userId });
            if (!exists) return res.status(404).json({ error: "User not found" });
            if (!req.file) return res.status(400).json({ error: "No file uploaded" });
            const profilePic = `/uploads/${req.file.filename}`;
            await users.updateOne({ _id: userId }, { $set: { profilePic } });
            res.status(200).json({ success: true, profilePic });
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    router.post("/test-notification/:id", async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);

            const user = await users.findOne({ _id: userId });
            if (!user) return res.status(404).json({ error: "User Not Found" });

            if (!user.fcmToken) return res.status(400).json({ error: "User has no fcmToken saved" });

            const response = await sendPushToToken(user.fcmToken, {
                title: "Vet App ✅",
                body: "Test notification from backend!",
                data: { type: "TEST" },
            });

            res.status(200).json({ success: true, messageId: response });
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // get specific user
    router.get("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);
            const user = await users.findOne({ _id: userId });
            if (!user) return res.status(404).json({ error: "User Not Found" });
            res.status(200).json(user);
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });


    return router;
}
