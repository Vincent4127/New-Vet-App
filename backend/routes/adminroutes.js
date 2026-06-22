// routes/adminroutes.js
import { Router } from "express";
import { ObjectId } from "mongodb";

const isValidObjectId = (id) => ObjectId.isValid(id);

export default function adminRoutes(users, pets, products) {
  const router = Router();

  const logError = (error, route) => {
    console.error(`Error in ${route}:`, error);
  };

  /**
   * =============================================
   *                PETS ROUTES
   * =============================================
   */

  // GET /admin/pets - Get all pets with owner info
  router.get("/pets", async (req, res) => {
    try {
      const pipeline = [
        { $sort: { name: 1 } },
        {
          $lookup: {
            from: "users",
            localField: "ownerId",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        {
          $unwind: {
            path: "$ownerInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            breed: 1,
            gender: 1,
            dateOfBirth: 1,
            ownerId: 1,
            medicalRecords: 1,
            reminders: 1,
            owner: {
              username: "$ownerInfo.username",
              email: "$ownerInfo.email",
              phone: "$ownerInfo.phone",
            },
          },
        },
      ];

      const allPets = await pets.aggregate(pipeline).toArray();
      res.status(200).json({ success: true, data: allPets });
    } catch (error) {
      logError(error, "GET /admin/pets");
      res.status(500).json({ error: "Server error while fetching pets." });
    }
  });

  // GET /admin/pets/search?q=
  router.get("/pets/search", async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: "Search query 'q' is required." });
    }

    try {
      const searchRegex = new RegExp(q.trim(), "i");
      const results = await pets
        .find({
          $or: [
            { name: { $regex: searchRegex } },
            { breed: { $regex: searchRegex } },
          ],
        })
        .sort({ name: 1 })
        .toArray();

      res.status(200).json({ success: true, data: results });
    } catch (error) {
      logError(error, "GET /admin/pets/search");
      res.status(500).json({ error: "Server error during pet search." });
    }
  });

  // GET /admin/pets/:petId
  router.get("/pets/:petId", async (req, res) => {
    const { petId } = req.params;
    if (!isValidObjectId(petId)) {
      return res.status(400).json({ error: "Invalid Pet ID format." });
    }

    try {
      const pet = await pets.findOne({ _id: new ObjectId(petId) });
      if (!pet) return res.status(404).json({ error: "Pet not found." });

      res.status(200).json({ success: true, data: pet });
    } catch (error) {
      logError(error, "GET /admin/pets/:petId");
      res.status(500).json({ error: "Server error while fetching pet." });
    }
  });

  // PUT /admin/pets/:petId - Update pet + embedded userPets copy
  router.put("/pets/:petId", async (req, res) => {
    const { petId } = req.params;
    const { name, breed, gender, dateOfBirth } = req.body;

    if (!isValidObjectId(petId)) {
      return res.status(400).json({ error: "Invalid Pet ID format." });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (breed) updateFields.breed = breed;
    if (gender) updateFields.gender = gender;
    if (dateOfBirth) {
      // DOB must be >= 1990 and not in the future
      if (dateOfBirth.day < 1 || dateOfBirth.day > 31) return res.status(400).json({ error: "Invalid Day" });
      if (dateOfBirth.month < 1 || dateOfBirth.month > 12) return res.status(400).json({ error: "Invalid Month" });
      if (Number(dateOfBirth.year) < 1990) return res.status(400).json({ error: "Date of birth year cannot be earlier than 1990" });
      const dob = new Date(Number(dateOfBirth.year), Number(dateOfBirth.month) - 1, Number(dateOfBirth.day));
      const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
      if (isNaN(dob.getTime())) return res.status(400).json({ error: "Invalid date of birth" });
      if (dob.getTime() > endOfToday.getTime()) return res.status(400).json({ error: "Date of birth cannot be in the future" });
      updateFields.dateOfBirth = dateOfBirth;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No update fields provided." });
    }

    try {
      const petObjectId = new ObjectId(petId);

      // 1) Update pets collection
      const petUpdateResult = await pets.updateOne(
        { _id: petObjectId },
        { $set: updateFields }
      );

      if (petUpdateResult.matchedCount === 0) {
        return res.status(404).json({ error: "Pet not found." });
      }

      // 2) Update the embedded copy in users.userPets
      const embeddedSet = Object.keys(updateFields).reduce((acc, key) => {
        acc[`userPets.$.${key}`] = updateFields[key];
        return acc;
      }, {});

      const userUpdateResult = await users.updateOne(
        { "userPets._id": petObjectId },
        { $set: embeddedSet }
      );

      res.status(200).json({
        success: true,
        data: { petUpdateResult, userUpdateResult },
      });
    } catch (error) {
      logError(error, "PUT /admin/pets/:petId");
      res.status(500).json({ error: "Server error while updating pet." });
    }
  });

  // DELETE /admin/pets/:petId - Delete pet + pull from userPets
  router.delete("/pets/:petId", async (req, res) => {
    const { petId } = req.params;
    if (!isValidObjectId(petId)) {
      return res.status(400).json({ error: "Invalid Pet ID format." });
    }

    try {
      const petObjectId = new ObjectId(petId);

      const petToDelete = await pets.findOne({ _id: petObjectId });
      if (!petToDelete) return res.status(404).json({ error: "Pet not found." });

      await pets.deleteOne({ _id: petObjectId });

      // Pull by _id from embedded userPets
      await users.updateOne(
        { _id: petToDelete.ownerId },
        { $pull: { userPets: { _id: petObjectId } } }
      );

      res.status(200).json({ success: true, message: "Pet deleted successfully." });
    } catch (error) {
      logError(error, "DELETE /admin/pets/:petId");
      res.status(500).json({ error: "Server error while deleting pet." });
    }
  });

  /**
   * =============================================
   *              RECORDS ROUTES
   * =============================================
   */

  // GET /admin/records/pet/:petId
  router.get("/records/pet/:petId", async (req, res) => {
    const { petId } = req.params;
    if (!isValidObjectId(petId)) {
      return res.status(400).json({ error: "Invalid Pet ID format." });
    }

    try {
      const pet = await pets.findOne(
        { _id: new ObjectId(petId) },
        { projection: { medicalRecords: 1 } }
      );
      if (!pet) return res.status(404).json({ error: "Pet not found." });

      res.status(200).json({ success: true, data: pet.medicalRecords || [] });
    } catch (error) {
      logError(error, "GET /admin/records/pet/:petId");
      res.status(500).json({ error: "Server error fetching medical records." });
    }
  });

  // POST /admin/records/pet/:petId
  // IMPORTANT: recordId stays STRING (same style as your existing backend)
  router.post("/records/pet/:petId", async (req, res) => {
    const { petId } = req.params;
    if (!isValidObjectId(petId)) {
      return res.status(400).json({ error: "Invalid Pet ID format." });
    }

    try {
      const { recordId, type, title, diagnosis, date, notes } = req.body || {};
      if (!recordId || !type || !title || !diagnosis || !date || !notes) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Optional: basic date validation (kept minimal)
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

      const petObjectId = new ObjectId(petId);

      // Ensure pet exists + get ownerId to target correct user
      const petDoc = await pets.findOne(
        { _id: petObjectId },
        { projection: { ownerId: 1 } }
      );
      if (!petDoc) return res.status(404).json({ error: "Pet not found." });

      const newRecord = { recordId, type, title, diagnosis, date, notes };

      // Prevent duplicate recordId on this pet
      const dup = await pets.findOne({ _id: petObjectId, "medicalRecords.recordId": recordId });
      if (dup) return res.status(409).json({ error: "Record already exists" });

      // 1) Add to pets collection
      await pets.updateOne(
        { _id: petObjectId },
        { $push: { medicalRecords: newRecord } }
      );

      // 2) Add to embedded pet in users collection
      await users.updateOne(
        { _id: petDoc.ownerId, "userPets._id": petObjectId },
        { $push: { "userPets.$.medicalRecords": newRecord } }
      );

      res.status(200).json({ success: true, data: newRecord });
    } catch (error) {
      logError(error, "POST /admin/records/pet/:petId");
      res.status(500).json({ error: "Server error adding medical record." });
    }
  });

  // DELETE /admin/records/pet/:petId/:recordId
  // IMPORTANT: recordId is STRING
  router.delete("/records/pet/:petId/:recordId", async (req, res) => {
    const { petId, recordId } = req.params;

    if (!isValidObjectId(petId)) {
      return res.status(400).json({ error: "Invalid Pet ID format." });
    }
    if (!recordId) {
      return res.status(400).json({ error: "recordId is required." });
    }

    try {
      const petObjectId = new ObjectId(petId);

      const petDoc = await pets.findOne(
        { _id: petObjectId },
        { projection: { ownerId: 1 } }
      );
      if (!petDoc) return res.status(404).json({ error: "Pet not found." });

      // 1) Pull from pets collection
      await pets.updateOne(
        { _id: petObjectId },
        { $pull: { medicalRecords: { recordId } } }
      );

      // 2) Pull from embedded pet in users collection
      await users.updateOne(
        { _id: petDoc.ownerId, "userPets._id": petObjectId },
        { $pull: { "userPets.$.medicalRecords": { recordId } } }
      );

      res.status(200).json({ success: true, message: "Record deleted." });
    } catch (error) {
      logError(error, "DELETE /admin/records/pet/:petId/:recordId");
      res.status(500).json({ error: "Server error deleting medical record." });
    }
  });

  /**
   * =============================================
   *              REMINDERS ROUTES
   * =============================================
   */

  // GET /admin/reminders - flattened reminders
  router.get("/reminders", async (req, res) => {
    try {
      const pipeline = [
        { $match: { reminders: { $exists: true, $ne: [] } } },
        { $unwind: "$reminders" },
        {
          $project: {
            _id: 0,
            reminderId: "$reminders.reminderId",
            title: "$reminders.title",
            dueDate: "$reminders.dueDate",
            createdAt: "$reminders.createdAt",
            petId: "$_id",
            petName: "$name",
            ownerId: "$ownerId",
          },
        },
      ];

      const allReminders = await pets.aggregate(pipeline).toArray();
      res.status(200).json({ success: true, data: allReminders });
    } catch (error) {
      logError(error, "GET /admin/reminders");
      res.status(500).json({ error: "Server error fetching reminders." });
    }
  });

  // DELETE /admin/reminders/pet/:petId/:reminderId
  // IMPORTANT: reminderId is STRING (appt_... etc)
  router.delete("/reminders/pet/:petId/:reminderId", async (req, res) => {
    const { petId, reminderId } = req.params;

    if (!isValidObjectId(petId)) {
      return res.status(400).json({ error: "Invalid Pet ID format." });
    }
    if (!reminderId) {
      return res.status(400).json({ error: "reminderId is required." });
    }

    try {
      const petObjectId = new ObjectId(petId);

      const petDoc = await pets.findOne(
        { _id: petObjectId },
        { projection: { ownerId: 1 } }
      );
      if (!petDoc) return res.status(404).json({ error: "Pet not found." });

      // 1) Pull from pets collection
      await pets.updateOne(
        { _id: petObjectId },
        { $pull: { reminders: { reminderId } } }
      );

      // 2) Pull from embedded pet in users collection
      await users.updateOne(
        { _id: petDoc.ownerId, "userPets._id": petObjectId },
        { $pull: { "userPets.$.reminders": { reminderId } } }
      );

      res.status(200).json({ success: true, message: "Reminder deleted." });
    } catch (error) {
      logError(error, "DELETE /admin/reminders/pet/:petId/:reminderId");
      res.status(500).json({ error: "Server error deleting reminder." });
    }
  });

  /**
   * =============================================
   *            APPOINTMENTS ROUTES
   * =============================================
   */

  // POST /admin/reminders/pet/:petId - Add a reminder
  router.post("/reminders/pet/:petId", async (req, res) => {
    const { petId } = req.params;

    if (!isValidObjectId(petId)) {
      return res.status(400).json({ error: "Invalid Pet ID format." });
    }

    const title = String(req.body?.title || "").trim();
    const dueDate = req.body?.dueDate || {};

    const day = Number(dueDate.day);
    const month = Number(dueDate.month);
    const year = Number(dueDate.year);
    const hour = dueDate.hour === "" || dueDate.hour == null ? 0 : Number(dueDate.hour);
    const minutes = dueDate.minutes === "" || dueDate.minutes == null ? 0 : Number(dueDate.minutes);

    if (!title) return res.status(400).json({ error: "Title is required." });
    if (!day || !month || !year) {
      return res.status(400).json({ error: "Due date (day/month/year) is required." });
    }
    // Reminder date cannot be in the past (today allowed)
    {
      const picked = new Date(year, month - 1, day);
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      if (isNaN(picked.getTime())) return res.status(400).json({ error: "Invalid date" });
      if (picked.getTime() < startOfToday.getTime()) return res.status(400).json({ error: "Reminder date cannot be in the past" });
    }

    try {
      // create reminder (use ObjectId like records do)
      const reminder = {
        reminderId: new ObjectId(),
        title,
        dueDate: { day, month, year, hour, minutes },
        createdAt: new Date(),
      };

      // 1) push into pets collection
      const petUpdate = await pets.updateOne(
        { _id: new ObjectId(petId) },
        { $push: { reminders: reminder } }
      );

      if (petUpdate.matchedCount === 0) {
        return res.status(404).json({ error: "Pet not found." });
      }

      // 2) push into embedded pet in users collection (if you store reminders there too)
      await users.updateOne(
        { "userPets._id": new ObjectId(petId) },
        { $push: { "userPets.$.reminders": reminder } }
      );

      return res.status(201).json({ success: true, data: reminder });
    } catch (error) {
      logError(error, "POST /admin/reminders/pet/:petId");
      return res.status(500).json({ error: "Server error adding reminder." });
    }
  });

  // GET /admin/appointments - Flatten all user appointments
  router.get("/appointments", async (req, res) => {
    try {
      // safer filter: only users with a real appointment day
      const usersWithAppointments = await users
        .find({ "appointment.day": { $ne: null } })
        .project({ username: 1, email: 1, appointment: 1 })
        .toArray();

      const flattened = usersWithAppointments.map((u) => ({
        userId: u._id,
        username: u.username,
        email: u.email,
        appointment: u.appointment,
      }));

      res.status(200).json({ success: true, data: flattened });
    } catch (error) {
      logError(error, "GET /admin/appointments");
      res.status(500).json({ error: "Server error fetching appointments." });
    }
  });

  // PUT /admin/appointments/cancel/:userId
  // match your mobile "cancel" behavior better by setting fields to null
  router.put("/appointments/cancel/:userId", async (req, res) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid User ID format." });
    }

    try {
      const result = await users.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            appointment: {
              day: null,
              month: null,
              year: null,
              hour: null,
              minutes: null,
            },
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found." });
      }

      res.status(200).json({ success: true, message: "Appointment canceled." });
    } catch (error) {
      logError(error, "PUT /admin/appointments/cancel/:userId");
      res.status(500).json({ error: "Server error canceling appointment." });
    }
  });

  /**
   * =============================================
   *                USERS ROUTES
   * =============================================
   */

  // GET /admin/users/search?q=
  router.get("/users/search", async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: "Search query 'q' is required." });
    }

    try {
      const searchRegex = new RegExp(q.trim(), "i");
      const results = await users
        .find({
          $or: [
            { username: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { phone: { $regex: searchRegex } },
          ],
        })
        .sort({ username: 1 })
        .toArray();

      res.status(200).json({ success: true, data: results });
    } catch (error) {
      logError(error, "GET /admin/users/search");
      res.status(500).json({ error: "Server error during user search." });
    }
  });

  /**
   * =============================================
   *              PRODUCTS ROUTES
   * =============================================
   */

  // GET /admin/products/search?q=
  // IMPORTANT: search productId (string), not _id
  router.get("/products/search", async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: "Search query 'q' is required." });
    }

    try {
      const searchRegex = new RegExp(q.trim(), "i");
      const results = await products
        .find({
          $or: [
            { productId: { $regex: searchRegex } },
            { name: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
          ],
        })
        .sort({ productId: 1 })
        .toArray();

      res.status(200).json({ success: true, data: results });
    } catch (error) {
      logError(error, "GET /admin/products/search");
      res.status(500).json({ error: "Server error during product search." });
    }
  });

  return router;
}
