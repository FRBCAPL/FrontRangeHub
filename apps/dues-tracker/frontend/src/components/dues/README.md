# USA Pool League Dues Tracker

A standalone application for tracking dues payments from your USA Pool League members. This app is completely separate from your Front Range Pool Hub app and won't interfere with it.

## Features

- **Member Management**: Add, edit, and delete league members
- **Dues Tracking**: Track who has paid their dues and who hasn't
- **Payment Recording**: Record payment methods and notes
- **Summary Dashboard**: View total members, paid/unpaid counts, and total collected
- **Secure Admin Login**: Password-protected access
- **Clean Interface**: Easy-to-use web interface

## Quick Start

### 1. Install Dependencies

Navigate to the backend directory and install the required packages:

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

**Easy Setup (Recommended):**
Run the setup script to automatically copy your existing Front Range Pool Hub configuration:

```bash
node setup.js
```

**Manual Setup:**
If you prefer to set it up manually:

```bash
copy env.example .env
```

Edit the `.env` file with your settings (using the same database as your Front Range Pool Hub):

```
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/front-range-pool-hub
JWT_SECRET=front-range-pool-hub-dev-secret-key-2024
ADMIN_EMAIL=admin@yourleague.com
ADMIN_PASSWORD=admin123
```

**Note:** The app uses port 5001 to avoid conflicts with your Front Range Pool Hub (which uses port 5000).

### 3. Start MongoDB

Since you're using the same MongoDB as your Front Range Pool Hub, make sure MongoDB is running (it should already be running if your Front Range Pool Hub is working).

### 4. Start the Backend Server

```bash
npm start
```

The server will start on port 5001 (to avoid conflicts with your Front Range Pool Hub on port 5000).

### 5. Open the Frontend

Open the `frontend/index.html` file in your web browser, or serve it using a simple HTTP server:

```bash
# If you have Python installed
cd frontend
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### 6. Login

Use the default admin credentials:
- **Email**: admin@yourleague.com
- **Password**: admin123

You can change these in the `.env` file if you want different credentials.

## How to Use

### Adding Members

1. Click the "Add Member" button
2. Fill in the member's information:
   - Name (required)
   - Email (required)
   - Phone (optional)
   - Dues Amount (defaults to $50)
3. Click "Add Member"

### Recording Payments

1. Find the member in the list who needs to pay
2. Click the "Pay" button next to their name
3. Select the payment method (Cash, Check, Venmo, etc.)
4. Add any notes if needed
5. Click "Record Payment"

### Viewing Summary

The dashboard shows:
- Total number of members
- How many have paid dues
- How many still owe dues
- Total amount collected

### Managing Members

- **Edit**: Click the "Edit" button to modify member information
- **Mark Unpaid**: If someone needs to be marked as unpaid, click "Unpaid"
- **Delete**: Remove a member completely (use with caution)

## Database

The app uses the same MongoDB database as your Front Range Pool Hub app, but stores data in separate collections:
- `USAPoolLeagueMembers` - Member information (name, email, phone, dues amount)
- `USAPoolLeagueAdmins` - Admin user accounts for the dues tracker

This keeps the data organized and separate while using your existing database setup.

## Security

- Admin login required to access the system
- Passwords are encrypted using bcrypt
- JWT tokens for session management
- All API endpoints require authentication

## Customization

### Changing Default Dues Amount

Edit the `MemberSchema` in `backend/server.js`:

```javascript
duesAmount: { type: Number, default: 50 }, // Change 50 to your default amount
```

### Adding More Payment Methods

Edit the payment method dropdown in `frontend/index.html`:

```html
<select class="form-select" id="paymentMethod">
    <option value="Cash">Cash</option>
    <option value="Check">Check</option>
    <option value="Venmo">Venmo</option>
    <option value="PayPal">PayPal</option>
    <option value="Zelle">Zelle</option>
    <option value="Your New Method">Your New Method</option>
</select>
```

## Troubleshooting

### Server Won't Start

1. Make sure MongoDB is running
2. Check that the port isn't already in use
3. Verify your .env file is properly configured

### Can't Login

1. Check that the server is running
2. Verify your admin email and password in the .env file
3. Make sure you're using the correct credentials

### Database Connection Issues

1. Verify MongoDB is running
2. Check the MONGODB_URI in your .env file
3. Make sure the database name is correct

## Support

This is a standalone application that won't affect your existing Front Range Pool Hub app. If you need help or want to add features, the code is well-organized and documented.

## File Structure

```
USA-Pool-League-Dues-Tracker/
├── backend/
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   └── env.example        # Environment variables template
├── frontend/
│   ├── index.html         # Main web interface
│   └── app.js            # Frontend JavaScript
└── README.md             # This file
```
