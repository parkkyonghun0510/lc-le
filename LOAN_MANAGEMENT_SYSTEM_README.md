# ប្រព័ន្ធគ្រប់គ្រងកម្ចីប្រាក់ (Loan Management System)

## ទិដ្ឋភាពទូទៅ (Overview)

ប្រព័ន្ធគ្រប់គ្រងកម្ចីប្រាក់នេះត្រូវបានរចនាឡើងសម្រាប់ស្ថាប័នហិរញ្ញវត្ថុនៅកម្ពុជា ដើម្បីគ្រប់គ្រងដំណើរការនៃការស្នើសុំកម្ចីរបស់អតិថិជនតាមរយៈប្រព័ន្ធឌីជីថល។

This loan management system is designed for Cambodian financial institutions to manage customer loan applications through a comprehensive digital platform with clear organizational relationships and modern UI/UX.

## លក្ខណៈពិសេសសំខាន់ៗ (Key Features)

### 🏢 រចនាសម្ព័ន្ធអង្គការ (Organizational Structure)
- **សាខា (Branches)**: គ្រប់គ្រងទីតាំងសាខាផ្សេងៗ
- **នាយកដ្ឋាន (Departments)**: ការបែងចែកតាមនាយកដ្ឋាន
- **អ្នកគ្រប់គ្រង (Managers)**: ការគ្រប់គ្រងតាមកម្រិត
- **មន្ត្រីកម្ចី (Loan Officers)**: មន្ត្រីទទួលបន្ទុកពាក្យសុំ

### 👥 ការគ្រប់គ្រងអ្នកប្រើប្រាស់ (User Management)
- **តួនាទីផ្សេងៗ**: Admin, Manager, Officer, Viewer
- **ការអនុញ្ញាតតាមកម្រិត**: Role-based access control
- **ព័ត៌មានលម្អិត**: ព័ត៌មានបុគ្គលិកពេញលេញ

### 📋 ការគ្រប់គ្រងពាក្យសុំកម្ចី (Application Management)

#### ព័ត៌មានអតិថិជន (Customer Information)
- **ឈ្មោះ**: ភាសាខ្មែរ និង អក្សរឡាតាំង
- **អត្តសញ្ញាណប័ណ្ណ**: ប្រភេទ និង លេខ
- **ព័ត៌មានទំនាក់ទំនង**: ទូរស័ព្ទ, អាសយដ្ឋាន
- **ព័ត៌មានការងារ**: មុខរបរ, ប្រាក់ចំណូល

#### ព័ត៌មានកម្ចី (Loan Information)
- **ចំនួនទឹកប្រាក់**: ចំនួនដែលស្នើសុំ
- **គោលបំណង**: អាជីវកម្ម, កសិកម្ម, អប់រំ, លំនៅដ្ឋាន, យានយន្ត, វេជ្ជសាស្ត្រ
- **រយៈពេល**: ពី ៦ខែ ដល់ ៦០ខែ
- **ប្រភេទផលិតផល**: កម្ចីខ្នាតតូច, SME, កសិកម្ម, លំនៅដ្ឋាន

#### អ្នកធានា (Guarantor Information)
- **ព័ត៌មានអ្នកធានា**: ឈ្មោះ, ទូរស័ព្ទ, ទំនាក់ទំនង
- **ការផ្ទៀងផ្ទាត់**: ព័ត៌មានលម្អិត

### 📊 ការវាយតម្លៃហានិភ័យ (Risk Assessment)
- **ពិន្ទុឥណទាន**: Credit scoring system
- **កម្រិតហានិភ័យ**: ទាប, មធ្យម, ខ្ពស់
- **ការវិភាគហិរញ្ញវត្ថុ**: ប្រាក់ចំណូល, ចំណាយ, ទ្រព្យសម្បត្តិ

### 📁 ការគ្រប់គ្រងឯកសារ (Document Management)
- **ការផ្ទុកឯកសារ**: ប្រព័ន្ធផ្ទុកសុវត្ថិភាព
- **ប្រភេទឯកសារ**: អត្តសញ្ញាណប័ណ្ណ, វិក្កយបត្រ, កម្មសិទ្ធិ
- **ការមើលឯកសារ**: Preview និង download

### 🔄 ដំណើរការអនុម័ត (Approval Workflow)
1. **ព្រាង (Draft)**: ការបង្កើតពាក្យសុំ
2. **បានដាក់ស្នើ (Submitted)**: ដាក់ស្នើដោយអតិថិជន
3. **កំពុងពិនិត្យ (Under Review)**: ការពិនិត្យដោយមន្ត្រី
4. **អនុម័ត (Approved)**: អនុម័តដោយអ្នកគ្រប់គ្រង
5. **បដិសេធ (Rejected)**: បដិសេធជាមួយមូលហេតុ

## ការរចនាប្រព័ន្ធ (System Architecture)

### Backend (FastAPI + Python)
```
app/
├── core/                   # ការកំណត់ស្នូល
├── routers/               # API endpoints
│   ├── applications.py    # ការគ្រប់គ្រងពាក្យសុំ
│   ├── users.py          # ការគ្រប់គ្រងអ្នកប្រើប្រាស់
│   ├── departments.py    # នាយកដ្ឋាន
│   └── branches.py       # សាខា
├── models.py             # Database models
├── schemas.py            # Pydantic schemas
└── database.py           # Database connection
```

### Frontend (Next.js + React)
```
src/
├── app/                   # Next.js app router
│   ├── applications/     # ទំព័រពាក្យសុំ
│   ├── dashboard/        # ទំព័រដើម
│   ├── users/           # ការគ្រប់គ្រងអ្នកប្រើប្រាស់
│   └── settings/        # ការកំណត់
├── components/           # React components
│   ├── applications/    # Components ពាក្យសុំ
│   ├── layout/         # Layout components
│   └── ui/             # UI components
└── hooks/               # Custom React hooks
```

## ការប្រើប្រាស់ (Usage)

### សម្រាប់មន្ត្រីកម្ចី (For Loan Officers)
1. **បង្កើតពាក្យសុំថ្មី**: ចូលទៅ Applications → បង្កើតពាក្យសុំថ្មី
2. **បំពេញព័ត៌មាន**: បំពេញព័ត៌មានអតិថិជន, កម្ចី, អ្នកធានា
3. **ភ្ជាប់ឯកសារ**: ផ្ទុកឯកសារចាំបាច់
4. **ដាក់ស្នើ**: ដាក់ស្នើពាក្យសុំសម្រាប់ការពិនិត្យ

### សម្រាប់អ្នកគ្រប់គ្រង (For Managers)
1. **ពិនិត្យពាក្យសុំ**: មើលពាក្យសុំដែលបានដាក់ស្នើ
2. **វាយតម្លៃហានិភ័យ**: ពិនិត្យពិន្ទុឥណទាន និង ហានិភ័យ
3. **សម្រេចចិត្ត**: អនុម័ត ឬ បដិសេធពាក្យសុំ
4. **តាមដាន**: តាមដានដំណើរការទាំងអស់

### សម្រាប់អ្នកគ្រប់គ្រងប្រព័ន្ធ (For Administrators)
1. **គ្រប់គ្រងអ្នកប្រើប្រាស់**: បង្កើត, កែប្រែ, លុបអ្នកប្រើប្រាស់
2. **កំណត់សាខា**: គ្រប់គ្រងសាខា និង នាយកដ្ឋាន
3. **ការកំណត់ប្រព័ន្ធ**: កំណត់ការអនុញ្ញាត និង ការកំណត់ផ្សេងៗ
4. **របាយការណ៍**: មើលស្ថិតិ និង របាយការណ៍

## ការកំណត់ (Configuration)

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/lc_workflow

# JWT
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# API
API_V1_STR=/api/v1
PROJECT_NAME="LC Workflow"
```

### Database Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Create admin user
python setup_dummy_data.py
```

### Frontend Setup
```bash
# Navigate to frontend
cd lc-workflow-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## ការសុវត្ថិភាព (Security Features)

### Authentication & Authorization
- **JWT Tokens**: សម្រាប់ការផ្ទៀងផ្ទាត់
- **Role-based Access**: ការគ្រប់គ្រងសិទ្ធិតាមតួនាទី
- **Password Hashing**: ការអ៊ិនគ្រីបពាក្យសម្ងាត់

### Data Protection
- **Input Validation**: ការផ្ទៀងផ្ទាត់ទិន្នន័យចូល
- **SQL Injection Prevention**: ការការពារ SQL injection
- **File Upload Security**: ការការពារការផ្ទុកឯកសារ

## ការបង្ហាញទិន្នន័យ (Data Visualization)

### Dashboard Features
- **ស្ថិតិពាក្យសុំ**: ចំនួនពាក្យសុំតាមស្ថានភាព
- **ការអនុម័ត**: អត្រាការអនុម័ត និង បដិសេធ
- **ការអនុវត្ត**: ពេលវេលាដំណើរការ
- **ហានិភ័យ**: ការបែងចែកតាមកម្រិតហានិភ័យ

### Reports
- **របាយការណ៍ប្រចាំថ្ងៃ**: ពាក្យសុំថ្មី និង ការអនុម័ត
- **របាយការណ៍ប្រចាំខែ**: ស្ថិតិលម្អិត
- **របាយការណ៍តាមមន្ត្រី**: ការអនុវត្តរបស់មន្ត្រីនីមួយៗ

## ការគាំទ្រភាសាខ្មែរ (Khmer Language Support)

### UI/UX Features
- **ភាសាខ្មែរ**: ចំណុចប្រទាក់ជាភាសាខ្មែរ
- **ការបញ្ចូលទិន្នន័យ**: គាំទ្រការបញ្ចូលជាភាសាខ្មែរ
- **ការបង្ហាញ**: ការបង្ហាញព័ត៌មានជាភាសាខ្មែរ
- **ការបោះពុម្ព**: របាយការណ៍ជាភាសាខ្មែរ

### Business Context
- **ប្រភេទកម្ចី**: សម្រាប់ទីផ្សារកម្ពុជា
- **ការវាយតម្លៃ**: តាមស្តង់ដារកម្ពុជា
- **ឯកសារ**: ប្រភេទឯកសារកម្ពុជា
- **ការអនុម័ត**: ដំណើរការតាមច្បាប់កម្ពុជា

## ការអភិវឌ្ឍន៍បន្ត (Future Enhancements)

### Planned Features
- **Mobile App**: កម្មវិធីទូរស័ព្ទ Android/iOS
- **SMS Notifications**: ការជូនដំណឹងតាម SMS
- **Digital Signatures**: ហត្ថលេខាឌីជីថល
- **Credit Bureau Integration**: ការភ្ជាប់ជាមួយ Credit Bureau
- **Automated Risk Assessment**: ការវាយតម្លៃហានិភ័យស្វ័យប្រវត្តិ

### Technical Improvements
- **Performance Optimization**: ការបង្កើនប្រសិទ្ធភាព
- **Caching**: ការប្រើប្រាស់ Redis cache
- **Load Balancing**: ការចែកចាយបន្ទុក
- **Microservices**: ការបែងចែកជា microservices

## ការគាំទ្រ (Support)

### Documentation
- **API Documentation**: Swagger/OpenAPI docs
- **User Manual**: មគ្គុទ្ទេសក៍អ្នកប្រើប្រាស់
- **Developer Guide**: មគ្គុទ្ទេសក៍អ្នកអភិវឌ្ឍន៍

### Training
- **User Training**: ការបណ្តុះបណ្តាលអ្នកប្រើប្រាស់
- **Administrator Training**: ការបណ្តុះបណ្តាលអ្នកគ្រប់គ្រង
- **Technical Training**: ការបណ្តុះបណ្តាលបច្ចេកទេស

## ការទំនាក់ទំនង (Contact)

សម្រាប់ការគាំទ្របច្ចេកទេស និង ការសួរសំណួរ:
- Email: support@lcworkflow.com
- Phone: +855 XX XXX XXX
- Website: https://lcworkflow.com

---

*ប្រព័ន្ធនេះត្រូវបានរចនាឡើងដោយយកចិត្ទុកដាក់ចំពោះតម្រូវការរបស់ស្ថាប័នហិរញ្ញវត្ថុកម្ពុជា និង ការអនុវត្តតាមស្តង់ដារអន្តរជាតិ។*

*This system is designed with careful consideration for Cambodian financial institutions' needs and international best practices.*