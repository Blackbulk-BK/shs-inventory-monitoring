# 📘 Official User Manual & System Guide
**Web-Based Inventory Monitoring System with Real-Time Department Status**  
**Institution:** Luis Y. Ferrer Jr. Senior High School (LYFJSHS)  
**Track & Section:** TVL – ICT-CP 12-KOTLIN  
**Research Subject:** Practical Research 2 (Capstone Project)

---

## 1. What is This Website All About?

The **LYFJSHS Inventory & Department Status Monitoring System** is a centralized, cloud-based web application created specifically for **Luis Y. Ferrer Jr. Senior High School**. 

In a large Senior High School campus with multiple buildings (**Academic Building, STEM Building, and TVL Building**), students and teachers frequently visit key facilities—such as the **School Clinic, Library, Stock Rooms, Science Laboratories, and Computer Laboratories**—only to discover that the room is closed, occupied by a class, or that the assigned Coordinator is currently away. At the same time, facility coordinators often rely on manual paper logbooks or disconnected spreadsheets to track equipment, tools, and consumable supplies.

This website unifies **real-time facility status broadcasting**, **coordinator room presence tracking**, and **smart inventory management** into a single live platform accessible from any phone, tablet, or computer.

---

## 2. Core Purpose & Objectives of the System

1. **Broadcast Real-Time Facility Availability:**  
   Allow students, teachers, and administrators to check online whether a school facility is **Open**, **In Use**, **Under Maintenance**, or **Closed** before walking across campus.
2. **Track Coordinator Room Presence (Inside vs. Outside):**  
   Let facility coordinators broadcast whether they are physically **Inside** or **Outside** their assigned department in real time.
3. **Centralize Inventory & Prevent Shortages:**  
   Digitally record and monitor **Equipment**, **Consumables**, and **Tools** per facility, complete with automated **Low-Stock**, **Out of Stock**, and **Damaged** alerts.
4. **Enable Shared Governance & Student Delegation:**  
   Support dual **Teacher Coordinators** (*Primary Coordinator* and *Co-Coordinator*) and allow teachers to grant controlled editing permissions to trusted **Student Editors**.
5. **Automate Accountability & Statistical Reporting:**  
   Maintain a timestamped audit trail of every stock movement and status change, paired with **Daily, Weekly, and Monthly** analytics charts, **CSV (Excel) exports**, and **DepEd-formatted printable reports**.

---

## 3. User Roles & Access Permissions

| Role | Who It Is For | Key Permissions & Capabilities |
| :--- | :--- | :--- |
| **Teacher / Coordinator** | Faculty Members, Facility Coordinators, School Principals | • Create and manage monitored school facilities.<br>• Broadcast live room status (*Open, In Use, Maintenance, Closed*).<br>• Toggle physical room presence (*Inside Dept* / *Outside Dept*).<br>• Add, edit, deduct, and delete inventory stocks.<br>• Set stock visibility to **Public** or **Private (Teachers Only)**.<br>• Assign a **Co-Coordinator** and authorize **Student Editors**.<br>• Export CSV files and print official inventory reports. |
| **Authorized Student Editor** | Trusted SHS Learners selected by a Coordinator | • Assist a specific facility's coordinator based on granted checkboxes:<br>  - **Can Edit Stocks:** Add/deduct quantities and update item conditions.<br>  - **Can Update Status:** Broadcast live facility status changes.<br>• All updates are automatically logged under the student's name and LRN. |
| **Student / Campus Viewer** | All Registered Grade 11 & Grade 12 Students | • View live availability statuses of all campus facilities.<br>• Check whether the Primary Coordinator or Co-Coordinator is inside the room.<br>• View public inventory stocks and item conditions.<br>• Search the Campus Directory for active teachers and students. |

---

## 4. Step-by-Step User Guide

### 🔐 A. Creating an Account & Digital ID (`index.html`)
1. Open the website and click the **Create Account** tab.
2. **Select Your Account Role:**
   * Choose **Teacher** if you are a faculty member, department coordinator, or administrator (select your official DepEd Teacher/Principal rank).
   * Choose **Student** if you are a Senior High School learner (enter your **12-Digit LRN**, **Grade Level**, **SHS Track**, and **Strand & Section**).
3. **Upload Formal ID Picture (Optional):** Choose a clear photo (JPG, PNG, or WEBP up to 3MB) or skip and upload one later from your dashboard.
4. Enter your **Full Name (Last, First, M.I.)**, **Age**, **Email Address**, and **Password**, then click **Create Digital Profile**.
   * *Tip:* As you type, your **Live Digital ID Card** on the left panel previews your credentials in real time.

---

### 🔑 B. Signing In & Password Recovery
* **Multi-Identifier Sign In:** You do not need to memorize your email to log in. On the **Sign In** tab, you can enter any of the following in the identifier field:
  1. Your **Registered Email Address**
  2. Your **Full Name** (e.g., `Dela Cruz, Juan A.`)
  3. Your **12-Digit Student LRN** (e.g., `109876543210`)
* **Forgot Password (Gmail OTP Recovery):**
  1. Click **Forgot password?** above the password box.
  2. Enter your Email, Full Name, or 12-Digit LRN and click **Send Code to Gmail**.
  3. Check your Gmail inbox for the **6-digit verification code**, enter the code along with your new password, and click **Verify & Reset Password**.

---

### 🏢 C. Navigating Facilities by Building (`dashboard.html`)
1. On the left sidebar under **Monitored Facilities**, use the building filter tabs to view facilities by location:
   * **All** – Shows all monitored facilities across the campus.
   * **Academic** – Facilities in the Academic Building (e.g., *School Clinic, Library*).
   * **STEM** – Facilities in the STEM Building (e.g., *Science & Research Laboratories*).
   * **TVL** – Facilities in the TVL Building (e.g., *ICT Computer Laboratories, Stock Rooms*).
2. Click any facility card on the left to open its live workspace on the right.
3. **Adding a New Facility (Teachers Only):** Click the **+ New** button in the Monitored Facilities panel, select the **Campus Building**, enter the **Facility Name** and room location, choose its initial status, and click **Create Facility**.

---

### 🟢 D. Broadcasting Live Facility Status & Room Presence
1. **Facility Status Broadcaster:** At the top right of the selected facility workspace, Coordinators and Authorized Student Editors can click any status button to broadcast it live to all users:
   * 🟢 **Open** – Facility is open and accommodating students/staff.
   * 🔵 **In Use** – A class, lab session, or activity is currently ongoing.
   * 🟡 **Maintenance** – Undergoing cleaning, repair, or inventory audit.
   * 🔴 **Closed** – Facility is currently closed/locked.
2. **Coordinator Room Presence (`Inside` / `Outside`):**
   * Inside the **Coordinator 1** or **Co-Coordinator** card, the assigned teacher can click **Inside** when they enter the room and **Outside** when they step out.

---

### 👥 E. Assigning a Co-Coordinator & Student Editors
1. **Assigning a Co-Coordinator:**
   * In the facility header, click **Assign** on the **Co-Coordinator** card.
   * Type the teacher's name or email, select their profile from the live search results, and click **Save Co-Coordinator**.
2. **Authorizing Student Editors:**
   * Click **Manage** on the **Student Editors** card.
   * Search for a registered student by **Name**, **12-Digit LRN**, or **Email**.
   * Check **Can Edit Stocks** and/or **Can Update Status**, then click **Authorize Student**.
   * To remove access at any time, click **Revoke** beside the student's name.

---

### 📦 F. Managing Inventory Stocks & Visibility
1. Make sure the **Inventory Stocks & Low-Stock Alerts** tab is selected.
2. **Adding an Item:** Click **+ Add Stock** and provide:
   * **Item Name / Description** (e.g., *Desktop PC, RJ45 Connectors, First Aid Kit*)
   * **Category:** `Equipment`, `Consumable`, or `Tool`
   * **Measurement Unit:** `units`, `pcs`, `sets`, `boxes`, `packs`, or `rolls`
   * **Current Quantity** & **Low-Stock Alert Threshold**
   * **Physical Condition:** `Auto-Detect`, `Good / Serviceable`, or `Damaged / Unusable`
   * **Stock Visibility (Teachers Only):**
     * **Public (Students & Teachers):** Visible to everyone viewing the facility.
     * **Private (Teachers Only):** Hidden from student accounts; visible only to faculty.
3. **Quick `+` / `-` Stock Adjustments:** Click the **`+`** or **`-`** buttons directly in the **Stock Level** column to add or deduct 1 unit immediately.
4. **Automated Condition Alerts:**
   * When an item's quantity drops to or below its **Low-Stock Alert Threshold**, the system automatically flags it as **Low Stock**.
   * When quantity reaches `0`, it is automatically flagged as **Out of Stock**.

---

### 📊 G. Monitoring Logs, Analytics, CSV Export & Printing
1. Click the **Monitoring Logs & Statistics** tab in the workspace.
2. **Switch Time Periods:** Toggle between **Daily (Today)**, **Weekly (Last 7 Days)**, and **Monthly (Last 30 Days)** to update:
   * Period KPI Summary Counters (*Units Added, Units Deducted, Status Changes, Damaged Reports*).
   * The **Activity Movement Bar Chart** and **Current Stock Health Doughnut Chart**.
   * The **Timestamped Audit Trail** showing who performed each action and when.
3. **Export to Excel (CSV):** Click **Export CSV** to download the facility's complete inventory table as a `.csv` file.
4. **Print Official Report:** Click **Print Report** to format the page with the official **Republic of the Philippines • Department of Education • Luis Y. Ferrer Jr. Senior High School** report header for printing or saving as a PDF.

---

### 🔎 H. Campus Directory, Dark Mode & Profile Switching
* **Campus Directory (`Directory` button in top bar):** Search any registered Teacher or Student by Name, LRN, or Email to inspect their Official Digital ID, online status (`Active Now`), and which facility they are currently inside.
* **Dark Mode (`Moon / Sun` icon):** Switch between Light Mode and Dark Mode at any time.
* **Switch Profile:** Click your profile pill in the top navigation bar (or **Switch Profile** on your Digital ID card) to quickly switch between saved Teacher and Student accounts on the same device.

---

**Luis Y. Ferrer Jr. Senior High School** • **TVL - ICT-CP 12-KOTLIN**

