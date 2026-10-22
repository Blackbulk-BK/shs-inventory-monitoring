# 📦 Web-Based Inventory Monitoring System with Real-Time Department Status

![Status](https://img.shields.io/badge/Status-In%20Development-blue?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

> **Official Research Project Repository**  
> **Title:** *Development and Evaluation of a Web-Based Inventory Monitoring System with Real-Time Department Status for Senior High School*  
> **Institution:** Luis Y. Ferrer Jr. Senior High School  
> **Track & Section:** TVL - ICT-CP 12-KOTLIN  
> **Developed by:** Group NEXUS

---

## 📖 Project Overview

The **Web-Based Inventory Monitoring System with Real-Time Department Status** is a centralized cloud platform designed to modernize how Senior High School departments track equipment, manage consumable stocks, and broadcast laboratory/office availability. 

Powered by **Supabase (PostgreSQL + Realtime + Storage)** and **Vanilla JavaScript**, the system eliminates manual logbooks and fragmented spreadsheets by providing live status indicators, role-based access control for teachers and delegated student editors, and automated **Daily, Weekly, and Monthly** statistical monitoring per department.

---

## ✨ Key Features

### 🔐 1. Dynamic Role-Based Registration & Digital Profiles
* **Teacher / Department Coordinator Profile:** Captures Full Name, Age, Teacher Rank/Position (e.g., *Teacher I–III, Master Teacher, Coordinator*), and a Formal ID Picture.
* **Student Profile:** Captures Full Name, 12-Digit LRN (Learner Reference Number), Track, Strand, Grade Level, Age, and a Formal ID Picture.
* **Cloud Avatar Storage:** Formal photos are securely uploaded and served via Supabase Storage.

### 🏢 2. Department & Dual-Coordinator Management
* **Create Departments:** Teachers can initialize department workspaces (e.g., *ICT Computer Lab, STEM Science Lab, TVL-HE Kitchen*).
* **Co-Coordinator Linking:** Supports adding a second Teacher profile as a **Co-Coordinator** with full shared administrative privileges.
* **Student Editor Delegation:** Coordinators can grant or revoke specific **Edit Permissions** to trusted students (searched via LRN or Name) to help update stocks or department statuses.

### 🟢 3. Real-Time Department Status Board
* Instant live status broadcasting across all connected devices without page reloads:
  * 🟢 **Open** – Available for classes, borrowing, or transactions.
  * 🔴 **Closed** – Department or laboratory is currently unavailable.
  * 🟡 **Under Maintenance** – Ongoing equipment repair, cleaning, or inventory audit.
  * 🔵 **In Use** – Active class or laboratory session in progress.

### 📋 4. Smart Inventory & Stock Tracking
* Add, edit, and deduct department stocks categorized by **Equipment**, **Consumables**, or **Tools**.
* Automated condition and threshold badges (*Good*, *Low Stock*, *Out of Stock*, *Damaged*).
* Full accountability tracking showing which Coordinator or Student Editor performed the latest update.

### 📊 5. Daily, Weekly, & Monthly Statistical Monitoring
* **Daily Track:** Real-time log of today's stock movements, status shifts, and active editors.
* **Weekly Track:** 7-day comparative bar charts visualizing peak supply usage and restocking days.
* **Monthly Track:** 30-day inventory audit summaries with exportable/printable reports for school compliance.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Structure** | HTML5 | Semantic layout for Login/Registration (`index.html`) and Dashboard (`dashboard.html`) |
| **Styling & UI** | CSS3 + Tailwind CSS | Responsive layout, modal dialogs, and animated status badges |
| **Client Logic** | Vanilla JavaScript (ES6+) | Dynamic DOM manipulation, role switching, and API state handling |
| **Backend & Database** | Supabase (PostgreSQL) | Relational database, Row-Level Security (RLS), and Realtime subscriptions |
| **Authentication & Storage** | Supabase Auth & Storage | User session management and formal profile picture hosting |
| **Data Visualization** | Chart.js | Interactive Daily, Weekly, and Monthly department analytics charts |
| **Alerts & Icons** | SweetAlert2 & Lucide Icons | Clean toast notifications, confirmation modals, and UI iconography |
| **Deployment** | GitHub + Vercel | Version control and continuous production hosting |

---

## 📂 Project Folder Structure

```text
📁 shs-inventory-monitoring/
├── 📄 index.html              # Login & Dynamic Registration Page (Teacher / Student)
├── 📄 dashboard.html          # Main Application (Profiles, Live Status, Stocks, Analytics)
├── 📁 css/
│   └── 📄 style.css           # Custom styling, print media queries, and badge pulse animations
├── 📁 js/
│   ├── 📄 supabaseClient.js   # Supabase Project URL & Anon Key initialization
│   ├── 📄 auth.js             # Login, Role-based Sign-Up, and Formal Photo upload logic
│   ├── 📄 profile.js          # User Profile rendering, Co-Coordinator & Student Editor modals
│   ├── 📄 department.js       # Real-Time Department Status engine (Open/Closed/Maintenance)
│   ├── 📄 inventory.js        # Add, edit, deduct, and filter department stocks
│   └── 📄 analytics.js        # Chart.js integration for Daily, Weekly, and Monthly statistics
├── 📁 sql/
│   └── 📄 schema.sql          # Supabase PostgreSQL tables, foreign keys, and RLS policies
└── 📄 README.md               # Project Documentation
```

---

## 🗄️ Database Schema Overview

1. **`profiles`** – Stores unified user details linked to Supabase Auth (`id`, `role`, `full_name`, `age`, `avatar_url`, `teacher_rank`, `lrn`, `track`, `strand`, `grade_level`).
2. **`departments`** – Stores department info and live status (`id`, `dept_name`, `status`, `primary_coordinator_id`, `co_coordinator_id`, `updated_at`).
3. **`department_student_editors`** – Access control table linking authorized students to specific departments (`id`, `department_id`, `student_id`, `can_edit_stocks`, `can_update_status`).
4. **`inventory_stocks`** – Master list of items per department (`id`, `department_id`, `item_name`, `category`, `quantity`, `unit`, `condition_status`, `last_updated_by`).
5. **`activity_logs`** – Time-series audit trail powering the Daily, Weekly, and Monthly analytics (`id`, `department_id`, `user_id`, `action_type`, `item_id`, `quantity_changed`, `created_at`).

---

## 🚀 Quick Start & Local Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/lyfjshs-inventory-monitoring.git](https://github.com/your-username/lyfjshs-inventory-monitoring.git)
cd lyfjshs-inventory-monitoring
```

### 2. Configure Supabase
1. Create a new project at [supabase.com](https://supabase.com/).
2. Open the **SQL Editor** and run the contents of `sql/schema.sql` to create all tables and policies.
3. Go to **Storage** and create a public bucket named `profile-pictures`.
4. Copy your **Project URL** and **Anon Public Key** from **Project Settings > API** and paste them into `js/supabaseClient.js`:
   ```javascript
   const SUPABASE_URL = "[https://your-project-id.supabase.co](https://your-project-id.supabase.co)";
   const SUPABASE_ANON_KEY = "your-anon-key-here";
   const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```

### 3. Run the Application
Open `index.html` using the **Live Server** extension in Visual Studio Code (or deploy directly to Vercel).

---

## 🗺️ System Development Roadmap

- [x] **Phase 1:** Database, Storage & Architecture Setup
- [ ] **Phase 2:** Authentication, Dynamic Registration & Profile Module
- [ ] **Phase 3:** Department Creation, Co-Coordinators & Student Access Control
- [ ] **Phase 4:** Real-Time Department Status & Inventory Stock Engine
- [ ] **Phase 5:** Daily, Weekly & Monthly Analytics Module
- [ ] **Phase 6:** Beta Testing, Vercel Deployment & Research Evaluation

---



**Adviser & Subject Teacher:** Mr. Ryan Ken Narvaez 
**School:** Luis Y. Ferrer Jr. Senior High School (ICT-CP 12-KOTLIN)
