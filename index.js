const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/simpleLibrary');

// Define Schemas
const User = mongoose.model(
    'User',
    new mongoose.Schema({
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            minlength: [3, 'Username must be at least 3 characters long'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters long'],
        },
    })
);

const Book = mongoose.model(
    'Book',
    new mongoose.Schema({
        title: { type: String, required: [true, 'Title is required'] },
        author: { type: String, required: [true, 'Author is required'] },
        genre: { type: String, required: [true, 'Genre is required'] },
        year: {
            type: Number,
            required: [true, 'Year is required'],
            min: [1500, 'Year must be after 1500'],
            max: [new Date().getFullYear(), 'Year cannot be in the future'],
        },
        isAvailable: { type: Boolean, default: true },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
    })
);

// Seed Books (Run only once)
const seedBooks = async () => {
    await Book.insertMany([
        { title: 'Book 1', author: 'Author 1', genre: 'Fiction', year: 2020, isAvailable: true, price: 10 },
        { title: 'Book 2', author: 'Author 2', genre: 'Non-Fiction', year: 2018, isAvailable: true, price: 15 },
        { title: 'Book 3', author: 'Author 3', genre: 'Science', year: 2022, isAvailable: true, price: 20 },
    ]);
};
// Uncomment below to seed books once
seedBooks();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Routes

// Home
app.get('/', (req, res) => res.redirect('/login'));

// Registration
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('register', { error: 'All fields are required' });
    }

    try {
        const newUser = new User({ username, password });
        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        const message = error.message.includes('duplicate key') ? 'Username already exists' : error.message;
        res.render('register', { error: message });
    }
});

// Login
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { error: 'All fields are required' });
    }

    const user = await User.findOne({ username, password });
    if (!user) {
        return res.render('login', { error: 'Invalid credentials' });
    }

    res.redirect('/catalog');
});

// Book Catalog with Filters
app.get('/catalog', async (req, res) => {
    const { author, genre, year } = req.query;

    let filters = {};
    if (author) filters.author = author;
    if (genre) filters.genre = genre;
    if (year) {
        if (isNaN(year) || year < 1500 || year > new Date().getFullYear()) {
            return res.render('catalog', { books: [], error: 'Invalid year filter' });
        }
        filters.year = parseInt(year);
    }

    const books = await Book.find(filters);
    res.render('catalog', { books, error: null });
});

// Rent or Buy a Book
app.post('/book/:id/:action', async (req, res) => {
    const { id, action } = req.params;

    const book = await Book.findById(id);
    if (!book) return res.redirect('/catalog?error=Book+not+found');

    if (action === 'rent') {
        if (!book.isAvailable) return res.redirect('/catalog?error=Book+is+already+rented');
        book.isAvailable = false;
        await book.save();
    } else if (action === 'buy') {
        await Book.findByIdAndDelete(id);
    } else {
        return res.redirect('/catalog?error=Invalid+action');
    }

    res.redirect('/catalog');
});

// Start Server
app.listen(3000, () => console.log('Server is running at http://localhost:3000'));
