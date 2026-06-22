import { ObjectId } from "mongodb";
import express from "express";
import multer from "multer";
import path from "path";

const petPicStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "pet_" + unique + path.extname(file.originalname));
    },
});
const petPicUpload = multer({
    storage: petPicStorage,
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only image files allowed"), false);
    },
    limits: { fileSize: 3 * 1024 * 1024 },
});

export default function petsRoutes(pets, users) {
    const router = express.Router();

    // get all pets
    router.get("/", async (req, res) => {
        try {
            const list = await pets.find({}).sort({ name: 1 }).toArray();
            res.json(list);
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // get user pets
    router.get('/getUserPets/:id', async (req, res) => {
        try {
            const id = req.params.id.trim();
            console.log("Received ID:", id, "Valid:", ObjectId.isValid(id));

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const userId = new ObjectId(id);
            const exists = await users.findOne({ _id: userId });
            if (!exists) return res.status(404).json({ error: "User Not Found" });

            if (exists.userPets.length === 0) return res.status(200).json([]);
            res.status(200).json(exists.userPets);
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // get specific pet
    router.get("/:id/:name", async (req, res) => {
        try {
            const { id, name } = req.params;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const ownerId = new ObjectId(id);

            const exists = await users.findOne({ _id: ownerId });
            if (!exists) return res.status(404).json({ error: "User not found" });
            const petExists = await pets.findOne({ name: name, ownerId: ownerId });
            if (!petExists) return res.status(404).json({ error: "This pet wasn't found in the user's pets" });

            res.status(200).json({ pet: petExists });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // add a pet
    router.post('/addPet/:id', async (req, res) => {
        try {
            const { name, dateOfBirth, breed, gender } = req.body;
            const { id } = req.params;
            const medicalRecords = [];
            const reminders = [];

            if (!name || !dateOfBirth || !breed || !gender) return res.status(400).json({ error: "All Fields Are Required." });
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid user id" });
            const ownerId = new ObjectId(id);
            const owner = await users.findOne({ _id: ownerId });
            if (!owner) return res.status(404).json({ error: "User Not Found" });

            if (gender.toLowerCase() != "male" && gender.toLowerCase() != "female") return res.status(400).json({ error: "Invalid gender" });
            if (dateOfBirth.day < 1 || dateOfBirth.day > 31) return res.status(400).json({ error: "Invalid Day" });
            if (dateOfBirth.month < 1 || dateOfBirth.month > 12) return res.status(400).json({ error: "Invalid Month" });
            // DOB must be >= 1990 and not in the future
            if (Number(dateOfBirth.year) < 1990) return res.status(400).json({ error: "Date of birth year cannot be earlier than 1990" });
            const dob = new Date(Number(dateOfBirth.year), Number(dateOfBirth.month) - 1, Number(dateOfBirth.day));
            const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
            if (isNaN(dob.getTime())) return res.status(400).json({ error: "Invalid date of birth" });
            if (dob.getTime() > endOfToday.getTime()) return res.status(400).json({ error: "Date of birth cannot be in the future" });
            const already = await users.findOne({
                _id: new ObjectId(id),
                "userPets.name": name
            });
            if (already) return res.status(409).json({ error: "Pet is already registred" })
            const newPet = {
                name: name, dateOfBirth: dateOfBirth, breed: breed, gender: gender.toLowerCase(),
                medicalRecords: medicalRecords, reminders: reminders, ownerId: ownerId
            };
            await pets.insertOne(newPet);
            await users.findOneAndUpdate(
                { _id: ownerId },
                { $push: { userPets: newPet } },
                { returnDocument: "after" }
            );
            res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }

    });

    // delete a pet

    router.delete('/deletePet/:id/:name', async (req, res) => {
        try {
            const { id, name } = req.params;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const ownerId = new ObjectId(id);

            const exists = await users.findOne({ _id: ownerId });
            if (!exists) return res.status(404).json({ error: "User not found" });
            const petExists = await pets.findOne({ name: name, ownerId: ownerId });
            if (!petExists) return res.status(404).json({ error: "This pet wasn't found in the user's pets" });
            const petId = petExists._id;

            await pets.deleteOne({ _id: petId });

            await users.updateOne(
                { _id: ownerId, "userPets.name": name },
                { $pull: { "userPets": { _id: petId } } }
            );

            return res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // update pet name
    router.put('/updatePetName/:id/:name', async (req, res) => {
        try {
            const { newName } = req.body;
            const { id, name } = req.params;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const ownerId = new ObjectId(id);

            const exists = await users.findOne({ _id: ownerId });
            if (!exists) return res.status(404).json({ error: "User not found" });
            const petExists = await pets.findOne({ name: name, ownerId: ownerId });
            if (!petExists) return res.status(404).json({ error: "This pet wasn't found in the user's pets" });
            const petId = petExists._id;

            if (!newName) return res.status(400).json({ error: "Please Enter the new name" });
            await pets.updateOne({ _id: petId }, { $set: { name: newName } });

            await users.updateOne(
                { _id: ownerId, "userPets._id": petId },
                { $set: { "userPets.$.name": newName } }
            );

            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }

    });

    // add a medical record
    router.put('/medicalRecord/:id/:name', async (req, res) => {
        try {
            const { recordId, type, title, diagnosis, date, notes } = req.body;
            const { id, name } = req.params;

            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const ownerId = new ObjectId(id);

            const exists = await users.findOne({ _id: ownerId });
            if (!exists) return res.status(404).json({ error: "User not found" });
            const petExists = await pets.findOne({ name: name, ownerId: ownerId });
            if (!petExists) return res.status(404).json({ error: "This pet wasn't found in the user's pets" });
            const petId = petExists._id;

            if (!recordId || !type || !title || !diagnosis || !date || !notes)
                return res.status(400).json({ error: "All fields are required" });

            if (date.day < 1 || date.day > 31) return res.status(400).json({ error: "Invalid Day" });
            if (date.month < 1 || date.month > 12) return res.status(400).json({ error: "Invalid Month" });
            if (date.year < 1) return res.status(400).json({ error: "Invalid Year" });
            // Record date cannot be in the past (today allowed)
            {
                const picked = new Date(Number(date.year), Number(date.month) - 1, Number(date.day));
                const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
                if (isNaN(picked.getTime())) return res.status(400).json({ error: "Invalid date" });
                if (picked.getTime() < startOfToday.getTime()) return res.status(400).json({ error: "Record date cannot be in the past" });
            }

            const newMedRec = { recordId: recordId, type: type, title: title, diagnosis: diagnosis, date: date, notes: notes };
            const already = await pets.findOne({ _id: petId, "medicalRecords.recordId": recordId });
            if (already) return res.status(409).json({ error: "Record already exists" });

            await pets.updateOne({ _id: petId }, { $push: { medicalRecords: newMedRec } });

            await users.updateOne(
                { _id: ownerId, "userPets.name": name },
                { $push: { "userPets.$.medicalRecords": newMedRec } }
            );

            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // remove medical record
    router.delete('/deleteMedicalRecord/:id/:name/:recordId', async (req, res) => {
        try {
            const { id, name, recordId } = req.params;

            if (!ObjectId.isValid(id))
                return res.status(400).json({ error: "Invalid user id" });

            const ownerId = new ObjectId(id);

            const user = await users.findOne({ _id: ownerId });
            if (!user) return res.status(404).json({ error: "User not found" });
            const pet = await pets.findOne({ name: name, ownerId: ownerId });
            if (!pet) return res.status(404).json({ error: "Pet not found" });

            const exists = await pets.findOne({
                _id: pet._id,
                "medicalRecords.recordId": recordId
            });
            if (!exists) return res.status(404).json({ error: "Medical record not found" });

            await pets.updateOne(
                { _id: pet._id },
                { $pull: { medicalRecords: { recordId: recordId } } }
            );

            await users.updateOne(
                { _id: ownerId, "userPets.name": name },
                { $pull: { "userPets.$.medicalRecords": { recordId: recordId } } }
            );

            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // add a reminder
    router.put('/addReminder/:id/:name', async (req, res) => {
        try {
            const { reminderId, title, dueDate } = req.body;
            const { id, name } = req.params;

            const createdAt = new Date();

            if (!ObjectId.isValid(id))
                return res.status(400).json({ error: "Invalid user id" });

            const ownerId = new ObjectId(id);

            const user = await users.findOne({ _id: ownerId });
            if (!user) return res.status(404).json({ error: "User not found" });
            const pet = await pets.findOne({ name: name, ownerId: ownerId });
            if (!pet) return res.status(404).json({ error: "Pet not found" });
            const petId = pet._id;

            if (!reminderId || !title || !dueDate || !createdAt)
                return res.status(400).json({ error: "All fields are required" });

            if (dueDate.day < 1 || dueDate.day > 31) return res.status(400).json({ error: "Invalid Day" });
            if (dueDate.month < 1 || dueDate.month > 12) return res.status(400).json({ error: "Invalid Month" });
            if (dueDate.year < 1) return res.status(400).json({ error: "Invalid Year" });
            if (dueDate.hour < 0 || dueDate.hour > 23) return res.status(400).json({ error: "Invalid Hour" });
            if (dueDate.minutes < 0 || dueDate.minutes > 59) return res.status(400).json({ error: "Invalid Minutes" });
            // Reminder date cannot be in the past (today allowed)
            {
                const picked = new Date(Number(dueDate.year), Number(dueDate.month) - 1, Number(dueDate.day));
                const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
                if (isNaN(picked.getTime())) return res.status(400).json({ error: "Invalid date" });
                if (picked.getTime() < startOfToday.getTime()) return res.status(400).json({ error: "Reminder date cannot be in the past" });
            }

            const newReminder = { reminderId: reminderId, title: title, dueDate: dueDate, createdAt: createdAt };
            await pets.updateOne({ _id: petId }, { $push: { reminders: newReminder } });
            await users.updateOne(
                { _id: ownerId, "userPets._id": petId },
                { $push: { "userPets.$.reminders": newReminder } }
            )
            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // delete a reminder
    router.delete('/deleteReminder/:id/:name/:reminderId', async (req, res) => {
        try {
            const { id, name, reminderId } = req.params;

            if (!ObjectId.isValid(id))
                return res.status(400).json({ error: "Invalid user id" });

            const ownerId = new ObjectId(id);

            const user = await users.findOne({ _id: ownerId });
            if (!user) return res.status(404).json({ error: "User not found" });

            const pet = await pets.findOne({ name: name, ownerId: ownerId });
            if (!pet) return res.status(404).json({ error: "Pet not found" });

            const petId = pet._id;

            const exists = await pets.findOne({
                _id: petId,
                "reminders.reminderId": reminderId
            });
            if (!exists) return res.status(404).json({ error: "Reminder not found" });

            await pets.updateOne(
                { _id: petId },
                { $pull: { reminders: { reminderId: reminderId } } }
            );

            await users.updateOne(
                { _id: ownerId, "userPets._id": petId },
                { $pull: { "userPets.$.reminders": { reminderId: reminderId } } }
            );

            return res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });




    // upload pet profile picture
    router.post('/uploadPetPic/:id/:name', petPicUpload.single("petPic"), async (req, res) => {
        try {
            const { id, name } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid Id" });
            const ownerId = new ObjectId(id);
            const owner = await users.findOne({ _id: ownerId });
            if (!owner) return res.status(404).json({ error: "User not found" });
            const pet = await pets.findOne({ name: decodeURIComponent(name), ownerId });
            if (!pet) return res.status(404).json({ error: "Pet not found" });
            if (!req.file) return res.status(400).json({ error: "No file uploaded" });
            const profilePic = `/uploads/${req.file.filename}`;
            await pets.updateOne({ _id: pet._id }, { $set: { profilePic } });
            await users.updateOne(
                { _id: ownerId, "userPets._id": pet._id },
                { $set: { "userPets.$.profilePic": profilePic } }
            );
            res.status(200).json({ success: true, profilePic });
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    return router;
}