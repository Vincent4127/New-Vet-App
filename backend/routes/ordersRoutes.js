// routes/ordersRoutes.js
import { Router } from "express";
import { ObjectId } from "mongodb";

const isValidObjectId = (id) => ObjectId.isValid(id);

export default function ordersRoutes(orders, users) {
    const router = Router();

    const logError = (error, route) => console.error(`Error in ${route}:`, error);

    // POST /orders — create a new order (user places it)
    router.post("/", async (req, res) => {
        try {
            const { userId, items, total, address } = req.body || {};

            if (!userId || !isValidObjectId(userId)) return res.status(400).json({ error: "Invalid user id" });
            if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Cart is empty" });
            if (typeof total !== "number" || total < 0) return res.status(400).json({ error: "Invalid total" });
            if (!address || !String(address).trim()) return res.status(400).json({ error: "Delivery address is required" });

            const owner = await users.findOne({ _id: new ObjectId(userId) });
            if (!owner) return res.status(404).json({ error: "User not found" });

            // Normalize items so we control exactly what is stored
            const cleanItems = items.map(it => ({
                productId: String(it.productId ?? ""),
                name: String(it.name ?? ""),
                price: Number(it.price ?? 0),
                qty: Math.max(1, Number(it.qty ?? 1)),
                image: it.image ? String(it.image) : null,
            }));

            const order = {
                orderNumber: "ORD-" + Date.now(),
                userId: new ObjectId(userId),
                // Snapshot of customer info at order time (NOT stored on the user profile)
                customer: {
                    username: owner.username ?? "",
                    email: owner.email ?? "",
                    phone: owner.phone ?? "",
                },
                items: cleanItems,
                total: Number(total),
                address: String(address).trim(),
                status: "pending",
                createdAt: new Date(),
                handledAt: null,
            };

            const result = await orders.insertOne(order);
            res.status(201).json({ success: true, orderId: result.insertedId, orderNumber: order.orderNumber });
        } catch (error) {
            logError(error, "POST /orders");
            res.status(500).json({ error: "Server error while creating order." });
        }
    });

    // GET /orders/current — pending orders (for the admin Orders tab)
    router.get("/current", async (req, res) => {
        try {
            const list = await orders.find({ status: "pending" }).sort({ createdAt: -1 }).toArray();
            res.status(200).json({ success: true, data: list });
        } catch (error) {
            logError(error, "GET /orders/current");
            res.status(500).json({ error: "Server error while loading orders." });
        }
    });

    // GET /orders/history — handled orders (confirmed + cancelled), for the History calendar
    router.get("/history", async (req, res) => {
        try {
            const list = await orders
                .find({ status: { $in: ["confirmed", "cancelled"] } })
                .sort({ createdAt: -1 })
                .toArray();
            res.status(200).json({ success: true, data: list });
        } catch (error) {
            logError(error, "GET /orders/history");
            res.status(500).json({ error: "Server error while loading order history." });
        }
    });

    // GET /orders/user/:userId — a single user's orders (any status)
    router.get("/user/:userId", async (req, res) => {
        try {
            const { userId } = req.params;
            if (!isValidObjectId(userId)) return res.status(400).json({ error: "Invalid user id" });
            const list = await orders.find({ userId: new ObjectId(userId) }).sort({ createdAt: -1 }).toArray();
            res.status(200).json({ success: true, data: list });
        } catch (error) {
            logError(error, "GET /orders/user/:userId");
            res.status(500).json({ error: "Server error while loading orders." });
        }
    });

    // PUT /orders/:id/status — confirm or cancel an order
    router.put("/:id/status", async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body || {};
            if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid order id" });
            if (!["confirmed", "cancelled"].includes(status))
                return res.status(400).json({ error: "Status must be 'confirmed' or 'cancelled'" });

            const result = await orders.findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $set: { status, handledAt: new Date() } },
                { returnDocument: "after" }
            );
            const updated = result?.value ?? result;
            if (!updated) return res.status(404).json({ error: "Order not found" });

            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            logError(error, "PUT /orders/:id/status");
            res.status(500).json({ error: "Server error while updating order." });
        }
    });

    return router;
}
