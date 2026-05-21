// ============================================================
//  MOMO TANTRA — JSON FILE & MONGODB DATABASE
//  Simple, fast, file-based persistence layer with MongoDB Atlas option
// ============================================================
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DATA_DIR = path.join(__dirname, 'data');

let MongoClient = null;
try {
  if (process.env.MONGO_URI) {
    MongoClient = require('mongodb').MongoClient;
  }
} catch (e) {
  logger.warn('MongoDB package not found or failed to load. Will run in local JSON/memory mode.');
}

// Default seed data
const SEEDS = {
  restaurant: {
    name: "Momo Tantra", bengali: "মম তন্ত্র", tagline: "Love at First Bite",
    rating: 4.6, totalReviews: 30, priceRange: "₹1–200",
    address: "12A, Jagadish Chandra Bose Road, Nabagram, Hooghly, West Bengal 712246",
    landmark: "Near Bharat Sevashram",
    phone1: "90079 93582", phone2: "90799 37257",
    whatsapp: "919079937257", email: "momotantra@gmail.com",
    openTime: "11:00 AM", closeTime: "9:30 PM",
    mapLink: "https://www.google.com/maps/place/Momo+Tantra/@22.7042467,88.3402636",
    features: ["Dine-in", "Drive-through", "No-contact delivery", "LGBTQ+ friendly"],
    deliveryFee: 20, freeDeliveryAbove: 200
  },

  categories: [
    { id: "veg_momos",     name: "Veg Momos",    icon: "🥟", badge: "Popular" },
    { id: "non_veg_momos", name: "Non Veg Momos", icon: "🍗", badge: "Bestseller" },
    { id: "chinese",       name: "Chinese",       icon: "🥡", badge: "" },
    { id: "combo",         name: "Combo Meals",   icon: "🍱", badge: "Value" },
    { id: "fry_items",     name: "Fry Items",     icon: "🍟", badge: "" },
    { id: "bread",         name: "Bread",         icon: "🫓", badge: "" },
    { id: "drinks",        name: "Drinks",        icon: "☕", badge: "" }
  ],

  menu: [
    { id:"paneer_momo",    category:"veg_momos",     name:"Paneer Momo",              description:"Soft steamed momos stuffed with fresh paneer and aromatic spices. Served with red chili chutney.", price:60,  servingSize:"5 pcs", image:"/images/paneer_momo_1779287508745.png",    isVeg:true,  isSpicy:false, isBestseller:false, isAvailable:true, rating:4.5, reviews:12 },
    { id:"veg_momo",       category:"veg_momos",     name:"Veg Momo",                 description:"Classic steamed vegetable momos with mixed veggies filling. Light, healthy and delicious.",        price:45,  servingSize:"5 pcs", image:"/images/veg_momo_1779287630269.png",       isVeg:true,  isSpicy:false, isBestseller:false, isAvailable:true, rating:4.3, reviews:18 },
    { id:"chicken_momo",   category:"non_veg_momos", name:"Chicken Momo",             description:"Juicy steamed momos packed with minced chicken seasoned with ginger, garlic and herbs.",           price:50,  servingSize:"5 pcs", image:"/images/chicken_momo_1779287491408.png",   isVeg:false, isSpicy:false, isBestseller:true,  isAvailable:true, rating:4.7, reviews:45 },
    { id:"chicken_cheese", category:"non_veg_momos", name:"Chicken Cheese Momo",      description:"Premium momos with chicken and melted cheese filling — gooey, savory, and irresistible.",         price:60,  servingSize:"5 pcs", image:"/images/chicken_momo_1779287491408.png",   isVeg:false, isSpicy:false, isBestseller:false, isAvailable:true, rating:4.6, reviews:22 },
    { id:"chicken_gondho", category:"non_veg_momos", name:"Chicken Gondhoraj Momo",   description:"Aromatic momos infused with Gondhoraj lemon — a Bengali specialty with unique citrus fragrance.", price:55,  servingSize:"5 pcs", image:"/images/chicken_momo_1779287491408.png",   isVeg:false, isSpicy:false, isBestseller:false, isAvailable:true, rating:4.8, reviews:15 },
    { id:"chicken_peri",   category:"non_veg_momos", name:"Chicken Peri Peri Momo",   description:"Fiery peri peri spiced chicken momos. Bold, spicy and packed with flavor.",                       price:55,  servingSize:"5 pcs", image:"/images/chicken_momo_1779287491408.png",   isVeg:false, isSpicy:true,  isBestseller:false, isAvailable:true, rating:4.5, reviews:19 },
    { id:"mutton_momo",    category:"non_veg_momos", name:"Mutton Momo",              description:"Tender mutton filling in soft steamed dumpling wrappers. Rich, hearty and satisfying.",             price:65,  servingSize:"5 pcs", image:"/images/mutton_momo_1779287548080.png",    isVeg:false, isSpicy:false, isBestseller:false, isAvailable:true, rating:4.6, reviews:20 },
    { id:"chilli_chicken", category:"chinese",       name:"Chilli Chicken",           description:"Indo-Chinese classic! Crispy chicken tossed in spicy chilli sauce with bell peppers and onions.",  price:80,  servingSize:"1 plate", image:"/images/chilli_chicken_1779287525017.png", isVeg:false, isSpicy:true,  isBestseller:true,  isAvailable:true, rating:4.7, reviews:30 },
    { id:"roti_combo",     category:"combo",         name:"Roti + Chilli Chicken",    description:"Best value meal! Soft roti paired with our signature chilli chicken. A complete meal!",             price:99,  servingSize:"1 combo", image:"/images/momo_combo_1779287614144.png",    isVeg:false, isSpicy:true,  isBestseller:false, isAvailable:true, rating:4.5, reviews:14 },
    { id:"extra_fry",      category:"fry_items",     name:"Extra Fry",                description:"Extra crispy fried accompaniment to complement your momos.",                                         price:10,  servingSize:"1 serve", image:"/images/pan_fried_momo_1779287563185.png", isVeg:true,  isSpicy:false, isBestseller:false, isAvailable:true, rating:4.2, reviews:8 },
    { id:"chicken_pakora", category:"fry_items",     name:"Chicken Pakora",           description:"Crispy golden chicken pakora — perfect evening snack with green chutney.",                          price:30,  servingSize:"1 plate", image:"/images/chicken_pakora_1779287580363.png", isVeg:false, isSpicy:false, isBestseller:false, isAvailable:true, rating:4.4, reviews:11 },
    { id:"pan_fried_momo", category:"fry_items",     name:"Pan Fried Momo",           description:"Golden pan-fried momos with a crispy bottom and juicy filling. Best of both worlds!",               price:80,  servingSize:"5 pcs", image:"/images/pan_fried_momo_1779287563185.png", isVeg:false, isSpicy:false, isBestseller:false, isAvailable:true, rating:4.6, reviews:17 },
    { id:"ruti",           category:"bread",         name:"Ruti (Roti)",              description:"Soft handmade flatbread, freshly prepared. Perfect with any curry or chilli chicken.",               price:4,   servingSize:"1 pc",  image:"/images/momo_combo_1779287614144.png",    isVeg:true,  isSpicy:false, isBestseller:false, isAvailable:true, rating:4.0, reviews:5 },
    { id:"tea",            category:"drinks",        name:"Tea (Cha)",                description:"Hot freshly brewed Indian tea — the perfect companion for your momos.",                             price:5,   servingSize:"1 cup", image:"/images/momo_soup_1779287646924.png",     isVeg:true,  isSpicy:false, isBestseller:false, isAvailable:true, rating:4.1, reviews:9 },
    { id:"coffee",         category:"drinks",        name:"Coffee",                   description:"Hot brewed coffee to warm you up on a cool evening.",                                                 price:10,  servingSize:"1 cup", image:"/images/momo_soup_1779287646924.png",     isVeg:true,  isSpicy:false, isBestseller:false, isAvailable:true, rating:4.0, reviews:6 },
    { id:"soft_drinks",    category:"drinks",        name:"Soft Drinks",              description:"Chilled refreshing soft drinks. Ask our staff for available brands.",                                 price:20,  servingSize:"1 bottle", image:"/images/momo_soup_1779287646924.png",  isVeg:true,  isSpicy:false, isBestseller:false, isAvailable:true, rating:4.0, reviews:7 }
  ],

  coupons: [
    { code:"MOMO10",     discount:10, type:"percent", minOrder:100, description:"10% off on orders above ₹100",           isActive:true },
    { code:"FIRSTBITE",  discount:20, type:"percent", minOrder:50,  description:"20% off for new customers",               isActive:true },
    { code:"FLAT30",     discount:30, type:"flat",    minOrder:150, description:"₹30 flat off on orders above ₹150",       isActive:true },
    { code:"DARJEELING", discount:15, type:"percent", minOrder:80,  description:"15% off — Darjeeling Vibe Special!",      isActive:true }
  ],

  offers: [
    { id:"offer1", title:"🎉 Grand Opening Special",  description:"Get 20% off your first order! Use code FIRSTBITE", badge:"Limited", isActive:true, image:"🥟" },
    { id:"offer2", title:"🌙 Evening Combo Deal",      description:"Roti + Chilli Chicken at just ₹99. Best value!",   badge:"Popular", isActive:true, image:"🍱" },
    { id:"offer3", title:"☕ Momo + Chai Combo",       description:"Order any momo plate + get Tea at just ₹2",        badge:"Special", isActive:true, image:"☕" }
  ],

  reviews: [
    { id:"r1", name:"Budhaditya Sengupta", avatar:"B", rating:5, date:"3 months ago", comment:"The small outlet is located just the lane next to my apartment. Tried their momo for the first time and it was really so good. They even put a liver piece in the soup which was an add on. I will definitely visit again.", isVerified:true, isApproved:true, ownerResponse:"", timestamp: Date.now() - 7776000000 },
    { id:"r2", name:"Mr Moghli",           avatar:"M", rating:3, date:"3 months ago", comment:"Momo was cold from inside and bland. Hair in soup. Just cheap momos if you prefer money before your health go ahead.",                                                                                                     isVerified:true, isApproved:true, ownerResponse:"We are really sorry to hear that sir. We ensure that you will get better service in future. Please feel free to contact us at 9079937257.", timestamp: Date.now() - 7776000000 },
    { id:"r3", name:"Sayan Ganguly",       avatar:"S", rating:5, date:"3 months ago", comment:"I bought chicken momos and chilli chicken from them. Both of them were delicious and taste was exquisite.",                                                                                                                  isVerified:false,isApproved:true, ownerResponse:"", timestamp: Date.now() - 7776000000 },
    { id:"r4", name:"Priya Sharma",        avatar:"P", rating:5, date:"1 month ago",  comment:"Ordered one plate chicken momo it's a beautiful and delicious 😋 and soft cooking।",                                                                                                                                       isVerified:true, isApproved:true, ownerResponse:"", timestamp: Date.now() - 2592000000 },
    { id:"r5", name:"Rahul Das",           avatar:"R", rating:5, date:"2 months ago", comment:"Excellent food, darjeeling vibe! Love the ambiance and the momos are heavenly.",                                                                                                                                             isVerified:true, isApproved:true, ownerResponse:"", timestamp: Date.now() - 5184000000 },
    { id:"r6", name:"Ananya Roy",          avatar:"A", rating:4, date:"2 months ago", comment:"Ordered 2 plates of momo, it was too good.. loved the taste.. Will definitely order again!",                                                                                                                                isVerified:false,isApproved:true, ownerResponse:"", timestamp: Date.now() - 5184000000 }
  ],

  orders: [],
  users: []
};

class WriteQueue {
  constructor() {
    this.promises = {};
  }
  async enqueue(key, fn) {
    if (!this.promises[key]) {
      this.promises[key] = Promise.resolve();
    }
    const nextPromise = this.promises[key].then(fn).catch(err => {
      logger.error(`WriteQueue error for ${key}: ${err.message}`);
    });
    this.promises[key] = nextPromise;
    return nextPromise;
  }
}

// ===== DB Class =====
class Database {
  constructor() {
    this._cache = {};
    this._queue = new WriteQueue();
    this._useMongo = false;
    this._mongoDb = null;
    this._useKV = false;
    this._kvUrl = null;
    this._kvToken = null;
    this._init();
    this._initDbStorage();
  }

  _filePath(collection) {
    return path.join(DATA_DIR, `${collection}.json`);
  }

  async _initDbStorage() {
    const usingKV = await this._initKV();
    if (!usingKV) {
      await this._initMongo();
    }
  }

  async _initKV() {
    const kvUrl = process.env.KV_REST_API_URL || process.env.KV_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken) return false;

    try {
      logger.db('Vercel KV detected. Connecting...');
      this._kvUrl = kvUrl.startsWith('http') ? kvUrl : `https://${kvUrl}`;
      this._kvToken = kvToken;
      
      const collections = Object.keys(SEEDS);
      for (const col of collections) {
        const res = await fetch(this._kvUrl, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${this._kvToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(['GET', col])
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const body = await res.json();
        
        if (body && body.result !== null && body.result !== undefined) {
          try {
            this._cache[col] = JSON.parse(body.result);
          } catch (e) {
            this._cache[col] = body.result;
          }
        } else {
          // Seed KV
          const val = SEEDS[col];
          const seedRes = await fetch(this._kvUrl, {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${this._kvToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', col, JSON.stringify(val)])
          });
          if (!seedRes.ok) {
            throw new Error(`Failed to seed ${col}. status: ${seedRes.status}`);
          }
          this._cache[col] = JSON.parse(JSON.stringify(val));
          logger.db(`Seeded Vercel KV collection: ${col}`);
        }
      }
      this._useKV = true;
      logger.db('Vercel KV persistence layer is fully active.');
      return true;
    } catch (e) {
      logger.error('Failed to connect to Vercel KV, falling back...', { error: e.message });
      this._useKV = false;
      return false;
    }
  }

  async _initMongo() {
    if (!process.env.MONGO_URI || !MongoClient) return;
    try {
      logger.db('Connecting to MongoDB Atlas...');
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();
      this._mongoDb = client.db(process.env.MONGO_DB_NAME || 'momotantra');
      logger.db('Connected to MongoDB Atlas database successfully.');
      
      const collections = Object.keys(SEEDS);
      for (const col of collections) {
        const dbCol = this._mongoDb.collection(col);
        const count = await dbCol.countDocuments();
        if (count === 0) {
          // Seed MongoDB
          if (Array.isArray(SEEDS[col])) {
            if (SEEDS[col].length > 0) {
              await dbCol.insertMany(SEEDS[col]);
            }
          } else {
            await dbCol.insertOne(SEEDS[col]);
          }
          logger.db(`Seeded MongoDB collection: ${col}`);
        }
        
        // Populate cache from MongoDB
        if (Array.isArray(SEEDS[col])) {
          const data = await dbCol.find({}).toArray();
          this._cache[col] = data;
        } else {
          const data = await dbCol.findOne({});
          if (data) {
            this._cache[col] = data;
          } else {
            this._cache[col] = SEEDS[col];
          }
        }
      }
      this._useMongo = true;
      logger.db('MongoDB persistence layer is fully active.');
    } catch (e) {
      logger.error('Failed to connect to MongoDB, falling back to local files', { error: e.message });
      this._useMongo = false;
    }
  }

  _init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      logger.warn(`Could not create data directory (normal on serverless): ${e.message}`);
    }

    Object.keys(SEEDS).forEach(col => {
      const fp = this._filePath(col);
      if (!fs.existsSync(fp)) {
        try {
          fs.writeFileSync(fp, JSON.stringify(SEEDS[col], null, 2), 'utf8');
          logger.db(`Seeded ${col}.json`);
        } catch (e) {
          logger.warn(`Could not seed file ${col}.json (will use memory): ${e.message}`);
        }
      }
      // Warm up cache
      this.read(col);
    });
  }

  read(collection) {
    if (this._cache[collection]) {
      return this._cache[collection];
    }
    try {
      const data = fs.readFileSync(this._filePath(collection), 'utf8');
      this._cache[collection] = JSON.parse(data);
      return this._cache[collection];
    } catch (e) {
      logger.warn(`DB read error for ${collection}, using default seed data: ${e.message}`);
      const defaultData = SEEDS[collection] ? JSON.parse(JSON.stringify(SEEDS[collection])) : (Array.isArray(SEEDS[collection]) ? [] : {});
      this._cache[collection] = defaultData;
      return defaultData;
    }
  }

  write(collection, data) {
    // Instantly update the cache to make reads reflect the update immediately
    this._cache[collection] = data;

    if (this._useKV && this._kvUrl) {
      this._queue.enqueue(collection, async () => {
        try {
          await fetch(this._kvUrl, {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${this._kvToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', collection, JSON.stringify(data)])
          });
        } catch (e) {
          logger.error(`Vercel KV write error for ${collection}`, { error: e.message });
        }
      });
      return true;
    }

    if (this._useMongo && this._mongoDb) {
      const dbCol = this._mongoDb.collection(collection);
      this._queue.enqueue(collection, async () => {
        try {
          await dbCol.deleteMany({});
          if (Array.isArray(data)) {
            if (data.length > 0) {
              const cleanData = JSON.parse(JSON.stringify(data)).map(item => {
                delete item._id;
                return item;
              });
              await dbCol.insertMany(cleanData);
            }
          } else {
            const cleanData = JSON.parse(JSON.stringify(data));
            delete cleanData._id;
            await dbCol.insertOne(cleanData);
          }
        } catch (e) {
          logger.error(`MongoDB async write error for ${collection}`, { error: e.message });
        }
      });
      return true;
    }

    // Queue the disk write asynchronously to avoid blocking the event loop or corrupting files
    const fp = this._filePath(collection);
    this._queue.enqueue(collection, async () => {
      try {
        const jsonStr = JSON.stringify(data, null, 2);
        const tmpPath = `${fp}.tmp`;
        await fs.promises.writeFile(tmpPath, jsonStr, 'utf8');
        await fs.promises.rename(tmpPath, fp);
      } catch (e) {
        logger.error(`DB async write error for ${collection}`, { error: e.message });
      }
    });
    return true;
  }

  // Convenience getters
  getMenu()       { return this.read('menu'); }
  getOrders()     { return this.read('orders'); }
  getCoupons()    { return this.read('coupons'); }
  getOffers()     { return this.read('offers'); }
  getReviews()    { return this.read('reviews'); }
  getRestaurant() { return this.read('restaurant'); }
  getCategories() { return this.read('categories'); }
  getUsers()      { return this.read('users') || []; }

  getOrder(id) {
    return this.getOrders().find(o => o.id === id) || null;
  }

  addOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order);
    this.write('orders', orders);
    return order;
  }

  updateOrder(id, updates) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    orders[idx] = { ...orders[idx], ...updates, updatedAt: Date.now() };
    this.write('orders', orders);
    return orders[idx];
  }

  generateOrderId() {
    return 'MT' + Date.now().toString().slice(-8).toUpperCase();
  }

  verifyCoupon(code, total) {
    const c = this.getCoupons().find(x => x.code.toUpperCase() === code.toUpperCase() && x.isActive);
    if (!c) return { valid: false, message: 'Invalid coupon code' };
    if (total < c.minOrder) return { valid: false, message: `Minimum order ₹${c.minOrder} required` };
    const discount = c.type === 'percent' ? Math.round(total * c.discount / 100) : c.discount;
    return { valid: true, coupon: c, discount, message: `₹${discount} discount applied!` };
  }
}

const db = new Database();
module.exports = db;
