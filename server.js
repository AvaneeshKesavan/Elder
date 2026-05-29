const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/algnite_elder';
const ADMIN_EMAIL = 'admin@algnite.com';
const SERVICE_VIEWS = new Set(['companion', 'housekeep', 'mealprep', 'medication', 'personal', 'transport']);

mongoose.set('strictQuery', true);

const schemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    age: { type: Number, default: null },
    gender: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    profilePicture: { type: String, default: '' },
  },
  schemaOptions
);

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    service: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    note: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'change-requested', 'cancelled'],
      default: 'pending',
    },
    requestedDate: { type: String, default: '' },
  },
  schemaOptions
);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'read'], default: 'new' },
  },
  schemaOptions
);

userSchema.virtual('id').get(function idGetter() {
  return this._id.toString();
});
bookingSchema.virtual('id').get(function idGetter() {
  return this._id.toString();
});
contactSchema.virtual('id').get(function idGetter() {
  return this._id.toString();
});

const User = mongoose.model('User', userSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Contact = mongoose.model('Contact', contactSchema);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'yourSecretKey',
    resave: false,
    saveUninitialized: false,
  })
);

const upload = multer({ dest: 'public/uploads/' });
app.use('/uploads', express.static(path.resolve('public/uploads')));

function clearFlash(req) {
  req.session.success = null;
  req.session.error = null;
}

function toPlain(doc) {
  if (!doc) {
    return null;
  }
  if (typeof doc.toObject === 'function') {
    return doc.toObject({ virtuals: true });
  }
  return { ...doc };
}

function getPublicUser(doc) {
  const user = toPlain(doc);
  if (!user) {
    return null;
  }
  delete user.password;
  return user;
}

function toPlainArray(docs) {
  return docs.map((doc) => toPlain(doc));
}

function currentUser(req) {
  return req.session?.user || null;
}

function redirectTarget(req, fallback) {
  const nextTarget = req.body?.next || req.query?.next || fallback;
  if (typeof nextTarget === 'string' && nextTarget.startsWith('/')) {
    return nextTarget;
  }
  return fallback;
}

function isFutureBooking(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return false;
  }

  const candidate = new Date(`${dateValue}T${timeValue}`);
  return !Number.isNaN(candidate.getTime()) && candidate.getTime() > Date.now();
}

function ensureAdmin(req, res) {
  const user = currentUser(req);
  if (!user || user.email !== ADMIN_EMAIL) {
    res.redirect('/');
    return false;
  }
  return true;
}

async function getAdminStats() {
  const [users, bookings, contacts, pendingBookings, unreadMessages] = await Promise.all([
    User.countDocuments(),
    Booking.countDocuments(),
    Contact.countDocuments(),
    Booking.countDocuments({ status: 'pending' }),
    Contact.countDocuments({ status: 'new' }),
  ]);

  return {
    users,
    bookings,
    messages: contacts,
    pendingBookings,
    unreadMessages,
  };
}

async function renderAdminPage(req, res, currentPage) {
  const statsPromise = getAdminStats();
  let users = [];
  let bookings = [];
  let contacts = [];

  if (currentPage === 'users') {
    users = toPlainArray(await User.find().sort({ createdAt: -1 }));
  }

  if (currentPage === 'bookings') {
    bookings = toPlainArray(await Booking.find().sort({ createdAt: -1 }));
  }

  if (currentPage === 'messages') {
    contacts = toPlainArray(await Contact.find().sort({ createdAt: -1 }));
  }

  res.render('admin', {
    user: currentUser(req),
    users,
    bookings,
    contacts,
    currentPage,
    stats: await statsPromise,
  });
}

// Routes
app.get('/', (req, res) => res.render('index', { user: currentUser(req) }));

app.get('/about', (req, res) => res.render('about', { user: currentUser(req) }));
app.get('/volunteer', (req, res) => res.render('volunteer', { user: currentUser(req) }));
app.get('/services', (req, res) => res.render('services', { user: currentUser(req) }));
app.get('/services/:type', (req, res) => {
  const viewName = req.params.type.toLowerCase();
  if (!SERVICE_VIEWS.has(viewName)) {
    return res.redirect('/services');
  }
  return res.render(viewName, { user: currentUser(req) });
});

app.get('/contact', (req, res) => {
  const success = req.session.success;
  const error = req.session.error;
  clearFlash(req);
  res.render('contact', { user: currentUser(req), success, error });
});

app.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    await Contact.create({ name, email, subject, message, status: 'new' });
    req.session.success = 'Thank you for contacting us!';
  } catch (error) {
    req.session.error = 'Something went wrong. Please try again.';
  }

  res.redirect('/contact');
});

app.get('/login', (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render('auth', {
    isLogin: true,
    error,
    user: null,
    next: req.query.next || '',
    showForm: 'login',
  });
});

app.get('/register', (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render('auth', {
    isLogin: false,
    error,
    user: null,
    next: req.query.next || '',
    showForm: 'register',
  });
});

app.post('/register', async (req, res) => {
  const { fullname, email, password, age, gender, address, phone } = req.body;
  const nextTarget = redirectTarget(req, '/profile');

  if (!fullname || !email || !password || !phone) {
    req.session.error = 'Please fill in all required fields';
    return res.redirect('/register');
  }

  if (password.length < 6) {
    req.session.error = 'Password must be at least 6 characters';
    return res.redirect('/register');
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.session.error = 'Email already in use or something went wrong!';
      return res.redirect('/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await User.create({
      fullname,
      email,
      password: hashedPassword,
      age: age ? Number(age) : null,
      gender,
      address,
      phone,
    });

    req.session.user = getPublicUser(createdUser);
    return res.redirect(nextTarget);
  } catch (error) {
    req.session.error = 'Email already in use or something went wrong!';
    return res.redirect('/register');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const nextTarget = redirectTarget(req, '/profile');

  if (!email || !password) {
    req.session.error = 'Please enter both email and password.';
    return res.redirect('/login');
  }

  const userDoc = await User.findOne({ email: email.toLowerCase() });

  if (!userDoc) {
    req.session.error = 'Email not registered!';
    return res.redirect('/login');
  }

  const isMatch = await bcrypt.compare(password, userDoc.password);
  if (!isMatch) {
    req.session.error = 'Invalid password!';
    return res.redirect('/login');
  }

  req.session.user = getPublicUser(userDoc);
  if (req.session.user.email === ADMIN_EMAIL) {
    return res.redirect('/admin');
  }

  return res.redirect(nextTarget);
});

app.get('/profile', async (req, res) => {
  if (!currentUser(req)) {
    return res.redirect('/login?next=/profile');
  }

  const userDoc = await User.findById(currentUser(req).id);
  if (!userDoc) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }

  res.render('profile', { user: getPublicUser(userDoc) });
});

app.post('/profile/update', upload.single('profilePicture'), async (req, res) => {
  if (!currentUser(req)) {
    return res.redirect('/login?next=/profile');
  }

  const { fullname, age, gender, address, phone } = req.body;
  const userDoc = await User.findById(currentUser(req).id);

  if (!userDoc) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }

  userDoc.fullname = fullname;
  userDoc.age = age ? Number(age) : null;
  userDoc.gender = gender;
  userDoc.address = address;
  userDoc.phone = phone;

  if (req.file) {
    userDoc.profilePicture = req.file.filename;
  }

  await userDoc.save();
  req.session.user = getPublicUser(userDoc);
  res.redirect('/profile');
});

app.get('/book', async (req, res) => {
  if (!currentUser(req)) {
    return res.redirect('/login?next=/book');
  }

  const success = req.session.success;
  const error = req.session.error;
  clearFlash(req);

  const bookingList = toPlainArray(
    await Booking.find({ email: currentUser(req).email }).sort({ createdAt: -1 })
  );

  res.render('book', {
    user: currentUser(req),
    success,
    error,
    bookingList,
  });
});

app.post('/book', async (req, res) => {
  if (!currentUser(req)) {
    return res.redirect('/login?next=/book');
  }

  const { service, date, time, note } = req.body;
  const user = currentUser(req);

  if (!service || !date || !time) {
    req.session.error = 'Please choose a service, date, and time.';
    return res.redirect('/book');
  }

  if (!isFutureBooking(date, time)) {
    req.session.error = 'Choose a future booking date and time.';
    return res.redirect('/book');
  }

  const duplicateBooking = await Booking.findOne({
    email: user.email,
    service,
    date,
    time,
    status: { $nin: ['cancelled', 'rejected'] },
  });

  if (duplicateBooking) {
    req.session.error = 'You already have a booking for that slot.';
    return res.redirect('/book');
  }

  try {
    await Booking.create({
      userId: user.id,
      name: user.fullname,
      email: user.email,
      service,
      date,
      time,
      note,
      status: 'pending',
    });
    req.session.success = 'Booking successful!';
  } catch (error) {
    req.session.error = 'Booking failed. Please try again.';
  }

  return res.redirect('/book');
});

app.post('/bookings/:id/cancel', async (req, res) => {
  if (!currentUser(req)) {
    return res.redirect('/login?next=/book');
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking || booking.email !== currentUser(req).email) {
    req.session.error = 'Booking not found.';
    return res.redirect('/book');
  }

  if (booking.status === 'cancelled') {
    req.session.error = 'This booking is already cancelled.';
    return res.redirect('/book');
  }

  booking.status = 'cancelled';
  await booking.save();
  req.session.success = 'Booking cancelled.';
  return res.redirect('/book');
});

app.get('/admin', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  return renderAdminPage(req, res, 'users');
});

app.get('/admin/bookings', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  return renderAdminPage(req, res, 'bookings');
});

app.get('/admin/messages', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  return renderAdminPage(req, res, 'messages');
});

app.post('/admin/bookings/approve', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  await Booking.findByIdAndUpdate(req.body.id, {
    status: 'approved',
    requestedDate: '',
  });
  return res.redirect('/admin/bookings');
});

app.post('/admin/bookings/reject', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  await Booking.findByIdAndUpdate(req.body.id, {
    status: 'rejected',
    requestedDate: '',
  });
  return res.redirect('/admin/bookings');
});

app.post('/admin/bookings/request-change', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  await Booking.findByIdAndUpdate(req.body.id, {
    status: 'change-requested',
    requestedDate: req.body.newDate || '',
  });
  return res.redirect('/admin/bookings');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

async function startServer() {
  try {
    await mongoose.connect(mongoUri);
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log('Connected to MongoDB');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
