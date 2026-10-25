# Twiller 2.0

A social media web application where users can share tweets, interact with content, manage their profiles, and access additional features such as audio tweets, subscriptions, multilingual support, and login history.

## 🚀 Features

### 1. User Authentication
- User registration and login.
- Forgot password and password reset functionality.
- Email and phone-based verification where required.
- Login history tracking.

### 2. Tweet Management
- Create and view tweets.
- Audio tweet upload and playback.
- Audio uploads limited to **5 minutes** and **100 MB**.
- Audio uploads permitted between **2:00 PM and 7:00 PM IST**.

### 3. Browser Notifications
- Enable or disable browser notifications through the profile settings.
- Notifications for tweets containing the keywords **cricket** or **science**.

### 4. Subscription Plans
- Free, Bronze, Silver, and Gold subscription plans.
- Online payment integration using Razorpay.
- Invoice generation and email delivery.
- New subscription payments permitted only between **10:00 AM and 11:00 AM IST**.

### 5. Multilingual Support
Twiller supports six languages:
- English
- Spanish
- Hindi
- Portuguese
- Chinese
- French

Verification requirements:
- French: Email OTP verification.
- Other supported languages: Mobile OTP verification.

### 6. Login History and Security
- Tracks login activity and available device information.
- Records browser, operating system, device, and IP information where available.
- Chrome login requires email OTP verification.
- Edge login does not require additional browser-specific authentication.
- Mobile login is permitted between **10:00 AM and 1:00 PM IST**.

## 🛠️ Technology Stack

**Frontend**
- Next.js
- React
- TypeScript
- CSS

**Backend**
- Node.js
- Express.js

**Database and Authentication**
- MongoDB
- Firebase Authentication

**Payment Integration**
- Razorpay

**Deployment**
- Vercel — frontend
- Render — backend

## 📋 Prerequisites

Install the following before running the project:

- Node.js and npm
- Git
- MongoDB access
- Firebase project credentials
- Razorpay test or production credentials, as appropriate

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/akshayakumaras/twiller-2.0.git
cd twiller-2.0
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Configure the backend environment variables using your project's existing configuration and environment-variable names. Add the required database, authentication, email, and payment credentials.

Start the backend using the script defined in `backend/package.json`. For example, if the project defines a `start` script:

```bash
npm start
```

### 3. Set up the frontend

Open another terminal:

```bash
cd twiller-2.0/twiller
npm install
```

Configure the frontend environment variables required by your existing application, then run:

```bash
npm run dev
```

Open the local URL displayed in the terminal.

> **Note:** The commands above assume the project uses the indicated directory structure and npm scripts. Check each `package.json` for the exact available commands.

## 🔐 Environment Variables

Keep API keys, database credentials, email credentials, and secret keys in environment variables.

- Do not commit `.env` files containing secrets.
- Configure frontend variables using the naming convention required by your framework.
- Add production environment variables separately in Vercel and Render.
- Use Razorpay test credentials when testing payment flows.

## 🕒 Time-Based Restrictions

| Feature | Permitted time (IST) |
|---|---|
| Audio tweet uploads | 2:00 PM–7:00 PM |
| New subscription payments | 10:00 AM–11:00 AM |
| Mobile login | 10:00 AM–1:00 PM |

Time restrictions should be validated on the backend to prevent requests from bypassing frontend controls.

## 🌐 Deployment

- **Frontend:** [Twiller 2.0 — Vercel](https://twiller-2-0-gold.vercel.app/)
- **Source code:** [GitHub Repository](https://github.com/akshayakumaras/twiller-2.0)

The backend should be deployed separately and configured with the correct production environment variables.

## 🧪 Testing

Test the following before releasing changes:

- Registration, login, and password reset.
- Browser notification preferences and keyword matching.
- Audio upload file-size, duration, verification, and time restrictions.
- Subscription payment time restrictions and payment verification.
- Language selection and OTP verification.
- Login history recording and browser-specific authentication.

Use test accounts and payment sandbox credentials when possible.

## 🔒 Security

- Never expose private API keys or secrets in the repository.
- Validate important restrictions on the backend.
- Verify payment signatures before activating subscriptions.
- Protect user account information and login history.
- Use HTTPS in production.

## 👨‍💻 Author

**Akshaya Kumar A.S**

## 📄 License

No license has been specified. Add a `LICENSE` file if you intend to distribute this project under a particular open-source license.
