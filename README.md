# 🚦 TAFFIC-PRAHARI
### Report Responsibly. Make Roads Safer.

TAFFIC-PRAHARI is an AI-powered Traffic Violation Reporting and Management Platform designed to promote road safety through digital reporting, intelligent image processing, and transparent complaint tracking.

The platform enables citizens to report traffic violations, upload photographic evidence, identify vehicle registration numbers using AI-powered OCR, track submitted complaints, and access available vehicle-related information.

---

## 🎯 Project Objective

To develop a simple, secure, and user-friendly digital platform that connects citizens with traffic administration and encourages responsible road usage.

## ✨ Key Features

### 1. Traffic Violation Reporting
- Submit traffic violation complaints.
- Select violation categories.
- Enter vehicle registration numbers.
- Add incident date, time, and location.
- Provide additional descriptions.

### 2. Photographic Evidence
- Upload photographs of traffic violations.
- Preview images before submission.
- Store evidence securely.

### 3. AI-Based Number Plate Recognition
- Extract vehicle registration numbers from uploaded photographs using OCR.
- Allow users to verify and edit extracted numbers.
- Support manual number plate entry.

### 4. GPS Location Tracking
- Capture incident location using GPS.
- Display geographical coordinates.
- Allow manual location selection.

### 5. Complaint Tracking
- View previously submitted complaints.
- Track complaint status.
- Access complaint details.
- View administrative action history.

### 6. Vehicle & Challan Management
- Register personal vehicles.
- View associated complaints.
- Access available challan records.
- View previous vehicle-related reports.

### 7. Nearby Traffic Assistance
- Find nearby traffic police stations.
- View available contact information.
- Access directions and location details.

### 8. Admin Dashboard
- Review submitted complaints.
- Examine photographic evidence.
- Verify or reject reports.
- Update complaint statuses.
- Maintain administrative records.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React / JavaScript |
| Styling | CSS |
| Backend | Node.js / Express |
| Database | Supabase / PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| AI & OCR | OCR / Image Processing |
| Maps | Leaflet / OpenStreetMap |
| Charts | Chart.js |
| Deployment | Vercel |

---

## 🔄 How It Works

1. Citizen registers and logs into the platform.
2. Citizen submits a traffic violation complaint.
3. Photographic evidence is uploaded.
4. AI-assisted OCR extracts the vehicle registration number.
5. GPS identifies the incident location.
6. A unique complaint ID is generated.
7. An authorized administrator reviews the complaint.
8. The citizen tracks the complaint status through the dashboard.

---

## 🔐 Security & Privacy

- Secure authentication.
- Role-based access control.
- Protected complaint records.
- Secure evidence storage.
- Input and file validation.
- Restricted access to personal vehicle information.
- Administrative activity tracking.

---

## 📁 Project Structure

```text
taffic-prahari/
│
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   ├── services/
│   ├── hooks/
│   └── styles/
│
├── database/
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
```

### 2. Navigate to the Project Directory

```bash
cd taffic-prahari
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file and configure the required database and API credentials.

Never expose secret API keys or passwords in the repository.

### 5. Start the Development Server

```bash
npm run dev
```

---

## 🚀 Future Enhancements

- Advanced AI-based traffic violation detection.
- Improved number plate recognition.
- Authorized government challan API integration.
- Traffic violation hotspot analysis.
- Enhanced evidence verification.
- Advanced traffic analytics.

---

## ⚠️ Disclaimer

TAFFIC-PRAHARI is a citizen reporting and traffic management support platform.

Citizen-submitted complaints are not automatically considered verified violations or officially issued challans. Official records require authorized data sources and verification.

---

## 🎓 Project Information

**Project Name:** TAFFIC-PRAHARI

**Domain:** Web Development | Artificial Intelligence | Cyber Security

**Project Type:** Full-Stack Web Application

**Developed as:** B.Tech CSE Cyber Security Group Project

---

### 🚦 TAFFIC-PRAHARI

**Report Responsibly. Make Roads Safer.**

*Building a safer and more digitally connected road safety ecosystem.*
