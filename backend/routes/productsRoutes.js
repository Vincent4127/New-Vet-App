import { ObjectId } from "mongodb";
import express from "express"
import multer from "multer";
import path from "path";

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});



export default function productsRoutes(products) {
    const router = express.Router();

    // get all products
    router.get("/", async (req, res) => {
        try {
            const list = await products.find({}).sort({ productId: 1 }).toArray();
            res.json(list);
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // filter by type
    router.get("/type/:type", async (req, res) => {
        try {
            const { type } = req.params;
            if (!type) return res.status(400).json({ error: "All fields are required" });
            const list = await products.find({ type: type }).sort({ productId: 1 }).toArray();
            if (list.length == 0) return res.status(404).json({ error: "No items found!" });
            res.status(200).json(list);

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // get specific product
    router.get("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const product = await products.findOne({ productId: id });
            if (!product) return res.status(404).json({ error: "Product Not Found" });
            res.status(200).json(product);

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // add a product
    router.post("/newProduct", upload.single("image"), async (req, res) => {
        try {
            const { productId, name, price, description, stockQty, isActive, type } = req.body;

            if (!productId || !name || !price || !description || !stockQty || isActive === undefined)
                return res.status(400).json({ error: "All fields are required" });
            if (productId.length < 6) return res.status(400).json({ error: "Product id must be 6 characters at least" });
            if (price < 0.0) return res.status(400).json({ error: "Price Can't Be Negative" });
            if (stockQty < 0) return res.status(400).json({ error: "Quantity can't be negative" });

            const exists = await products.findOne({ productId });
            if (exists) return res.status(400).json({ error: "Product already exists" });

            const nameExist = await products.findOne({ name });
            if (nameExist) return res.status(400).json({ error: "Product Name Already Exists" });

            if (!req.file) return res.status(400).json({ error: "Image is required" });

            const newProduct = {
                productId: productId, name: name, price: price,
                description: description, stockQty: stockQty, isActive: isActive,
                type: type || null,
                images: [`/uploads/${req.file.filename}`], createdAt: new Date()
            };
            await products.insertOne(newProduct);
            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // delete a product
    router.delete("/delete/:id", async (req, res) => {
        try {
            const { id } = req.params;

            const product = await products.findOne({ productId: id });
            if (!product) return res.status(404).json({ error: "Product Not Found" });
            await products.deleteOne({ productId: id });
            res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    // update product
    router.put("/update/:id", async (req, res) => {
        try {
            const { newName, newPrice, newDescription, newStockQty, newIsActive, newType } = req.body;
            const { id } = req.params;

            const product = await products.findOne({ productId: id });
            if (!product) return res.status(404).json({ error: "Product Not Found" });
            if (!newName && newPrice === undefined && !newDescription && newStockQty === undefined
                && newIsActive === undefined && newType === undefined)
                return res.status(400).json({ error: "At least edit one" });

            if (newName) {
                await products.findOneAndUpdate(
                    { productId: id },
                    { $set: { name: newName } },
                    { returnDocument: "after" }
                );
            }

            if (newPrice !== undefined) {
                if (newPrice < 0.0) return res.status(400).json({ error: "Price cannot be less than 0" });
                await products.findOneAndUpdate(
                    { productId: id },
                    { $set: { price: newPrice } },
                    { returnDocument: "after" }
                );
            }

            if (newDescription) {
                await products.findOneAndUpdate(
                    { productId: id },
                    { $set: { description: newDescription } },
                    { returnDocument: "after" }
                );
            }

            if (newStockQty !== undefined) {
                if (newStockQty < 0) return res.status(400).json({ error: "Stock Quantity cannot be less than 0" });
                await products.findOneAndUpdate(
                    { productId: id },
                    { $set: { stockQty: newStockQty } },
                    { returnDocument: "after" }
                );
            }

            if (newIsActive !== undefined && product.isActive !== newIsActive) {
                await products.findOneAndUpdate(
                    { productId: id },
                    { $set: { isActive: newIsActive } },
                    { returnDocument: "after" }
                );
            }

            if (newType !== undefined) {
                await products.findOneAndUpdate(
                    { productId: id },
                    { $set: { type: newType } },
                    { returnDocument: "after" }
                );
            }

            res.status(200).json({ success: true });

        } catch (error) {
            return res.status(500).json({ error: "Server Error", detail: error.message });
        }
    });

    return router;
}
