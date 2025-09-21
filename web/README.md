# INT Asana Report
โปรเจ็คนี้เป็นเว็บแอปที่สร้างขึ้นด้วย Next.js 13 และ TypeScript โดยใช้ App Router, Prisma, Shadcn, Axios, และ Tailwind CSS เพื่อสร้างรายงานจากข้อมูลใน Asana
## Data Operations
1. ดึงข้อมูลจาก Asana API และจัดเก็บในฐานข้อมูลด้วย Prisma ลงในตารางต่างๆ เช่น tasks, projects, users, task_followers
2. มีการจัดการความสัมพันธ์ระหว่างตาราง เช่น task_followers ที่เชื่อมโยง tasks กับ assignees
3. Prisma schema ถูกกำหนดในไฟล์ `prisma/schema.prisma`
4. Database ที่ใช้คือ PostgreSQL version 17 และเชื่อมต่อผ่านตัวแปรสภาพแวดล้อม `DATABASE_URL`
5. เพื่อความปลอดภัย ข้อมูลสำคัญ เช่น Asana Personal Access Token ถูกเก็บในไฟล์ `.env.local` และไม่ถูกเก็บในระบบควบคุมเวอร์ชัน
## Features
- ดึงข้อมูลจาก Asana API และจัดเก็บในฐานข้อมูล
- แสดงรายงานในรูปแบบตารางที่สามารถกรองและค้นหาได้
- ใช้ Shadcn UI components สำหรับการออกแบบอินเทอร์เฟซผู้ใช้
- รองรับการใช้งานบนอุปกรณ์เคลื่อนที่ด้วย Tailwind CSS
## Prerequisites
- Node.js (แนะนำเวอร์ชัน LTS)
- PostgreSQL (เวอร์ชัน 17)
- Asana Personal Access Token
## Data Models
- **Section** : เก็บข้อมูลส่วนต่างๆ ของโปรเจ็คใน Asana ในโปรเจ็คนี้จะใช้สำหรับจัดกลุ่มฝ่ายงาน
- **Task** : เก็บข้อมูลงานต่างๆ ที่ดึงมาจาก Asana ประกอบด้วย ชื่อเรื่อง, รายละเอียด, สถานะ, วันที่สร้าง, วันที่ครบกำหนด, ผู้รับผิดชอบ, ความสัมพันธ์กับ Section
- **Subtask** : เก็บข้อมูลงานย่อยที่เชื่อมโยงกับ Task หลัก และผู้ร่วมงาน(followers)
- **Assignee** : เก็บข้อมูลผู้รับผิดชอบงานใน Asana
- **SyncMetadata** : เก็บข้อมูลการซิงค์ข้อมูลจาก Asana API เช่น เวลาที่ซิงค์ล่าสุด
### Custom Operations
- การซิงค์ข้อมูลจาก Asana API โดยใช้ฟังก์ชันในไฟล์ `lib/` เช่น `asana.ts` สำหรับดึงข้อมูลและจัดเก็บในฐานข้อมูล
- การซิงค์แต่ละครั้งจะลบข้อมูลเก่าในตารางที่เกี่ยวข้องก่อน เพื่อป้องกันข้อมูลซ้ำซ้อน
- การดึงข้อมูลจะใช้การทำงานแบบ batch เพื่อเพิ่มประสิทธิภาพ และลดการเรียก API เกินขีดจำกัด ของ Asana และจะมี Rate Limiting เพื่อป้องกันการเรียก API เกินขีดจำกัด
- ใช้ Axios สำหรับการเรียก Asana API
### การคำนวณงาน
- ในการดำเนินงานในการดึงข้อมูลจาก Asana API ฉันจะดึงข้อมูลมาแค่ Project เดียวที่มีชื่อว่า "Weekly Priorities" และจะดึงข้อมูลเฉพาะ Task, Subtask ที่อยู่ในแต่ละ Section ซึ่ง Section จะเป็นตัวแทนของแต่ละฝ่ายงาน เช่น ฝ่ายบริหาร, ฝ่ายพัฒนา, ฝ่ายออกแบบ เป็นต้น
- สำหรับ Tasks ใน Section จะมีรูปแบบชื่อเรื่องที่กำหนดไว้ เช่น Week of 26-30 May 2025, Week of 2-6 June 2025 เป็นต้น ซึ่งจะเป็นการบ่งบอกว่าเป็นงานที่ต้องทำในสัปดาห์นั้นๆ
- ส่วน Subtasks จะเป็นงานย่อยที่อยู่ภายใต้ Tasks หลัก และจะมีการกำหนดผู้ร่วมงาน (followers) ที่เกี่ยวข้องกับงานย่อยนั้นๆ
- คำนิยามของ "งาน" หรือ "Task" ที่จะแสดงผลและมีการคำนวณ จะต้องดู Subtasks เท่านั้น เพราะเป็นงานที่ได้รับมอบหมายจริงๆเพราะข้อมูลของ Tasks จะเป็นแค่กรอบวันที่ในการจัดกลุ่มงานย่อย (Subtasks) เท่านั้น
- การแสดงงานจะต้องแสดงทั้งงานที่เป็น Assignee และ Followers ด้วย
- สถานะของงานจะมี 3 สถานะหลักๆ คือ Pending (งานที่ยังไม่ได้กำหนด Due Date และข้อมูลคอลัมน์ Completed เป็น False อยู่), Completed (งานที่เสร็จแล้ว มาจากข้อมูลคอลัมน์ Completed ถึงแม้ว่าจะไม่มีการระบุ Due Date ก็สามารถแสดงเป็น Completed ได้), Overdue (งานที่เกินกำหนด ด้วยการดูจากคอลัมน์ Due Date ว่าถึงวันที่กำหนดแล้ว แต่ข้อมูลคอลัมน์ Completed ยังเป็น False อยู่)
## UI Requirements
- เข้าถึงได้ที่ `/dashboard/{assignee_gid}` โดย `{assignee_gid}` คือ GID ของผู้รับผิดชอบงาน (Assignee)
1. Header
   - แสดงชื่อผู้รับผิดชอบงาน (Assignee)
   - แสดงเวลาที่ซิงค์ข้อมูลล่าสุด
   - ปุ่มสำหรับ Export PDF และ Export Excel
   - ปุ่ม Logout (ยังไม่ต้องทำงาน)
2. Admin Section (ref: components/AdminSection.tsx)
   - แสดงเฉพาะถ้าผู้ใช้ที่ล็อกอินเป็น Admin เท่านั้น
   - Dropdown สำหรับเลือกผู้รับผิดชอบงาน (Assignee) เพื่อดูรายงานของแต่ละคน
3. Summary Metric Cards (ref: components/SummaryMetricCards.tsx)
   - แสดงข้อมูลสรุป เช่น จำนวนงานทั้งหมด, งานที่เสร็จแล้ว,  งานที่เกินกำหนด, ร้อยละงานที่เสร็จแล้ว
4. Weekly Summary Chart(ref: components/WeeklySummaryChart.tsx)
   - กราฟแสดงสรุปงานรายสัปดาห์ โดยแยกตามสถานะงาน (Assigned, Completed, Overdue,Collab(แทนด้วย Followers),Expected(เป็นค่าคงที่ที่กำหนดจาก ENV REPORT_EXPECTED_TASKS_PER_WEEK=3))
5. Current Tasks Table (ref: components/CurrentTasksTable.tsx)
    - ตารางแสดงรายการงานปัจจุบัน โดยมีคอลัมน์ดังนี้:
        - Task Name: ชื่อเรื่องของงาน
        - Week: สัปดาห์ที่งานนั้นอยู่ (ดึงมาจาก Task หลัก)
        - Due Date: วันที่ครบกำหนด
        - Status: สถานะของงาน (Pending, Completed, Overdue)
        - Type: บทบาทของผู้ใช้ในงานนั้น (Assignee หรือ Collab(แทนด้วย Followers))
   - ฟีเจอร์การกรองข้อมูล:
        - กรองตามสถานะ (All, Completed, Overdue, Pending)
    - การจัดเรียงข้อมูล:
        - เรียงตาม Due Date (ล่าสุดไปเก่าสุด)
        - เรียงตาม Status (Completed, Overdue, Pending)
    - แสดงข้อมูลแบบแบ่งหน้า (Pagination) โดยแสดง 10 รายการต่อหน้า มีปุ่มสำหรับเปลี่ยนหน้า เรียกข้อมูลใหม่เมื่อเปลี่ยนหน้า
6. Responsive Design
   - ใช้ Tailwind CSS เพื่อให้แน่ใจว่า UI สามารถใช้งานได้ดีบนอุปกรณ์เคลื่อนที่และเดสก์ท็อป
7. Keep Design Simple
   - ใช้ Shadcn UI components เพื่อให้การออกแบบดูเรียบง่ายและสวยงาม
8. Lazy Loading
   - ใช้ React.lazy และ Suspense สำหรับการโหลดคอมโพเนนต์ที่ไม่จำเป็นต้องโหลดทันที เช่น กราฟและตารางงาน
## Environment Variables
- `DATABASE_URL` : URL สำหรับเชื่อมต่อกับฐานข้อมูล PostgreSQL
- `ASANA_BASE_URL` : Base URL สำหรับเข้าถึง Asana API
- `ASANA_TOKEN` : Personal Access Token สำหรับเข้าถึง Asana
- `ASANA_PROJECT_ID` : GID ของ Project ใน Asana
- `REPORT_EXPECTED_TASKS_PER_WEEK` : จำนวนงานที่คาดหวังต่อสัปดาห์ (ใช้ในกราฟสรุป)
- `ASANA_TEAM_ID` : GID ของทีมใน Asana
- `ASANA_RATE_LIMIT` : จำนวนครั้งสูงสุดที่สามารถเรียก Asana APIได้ต่อชั่วโมง (default: 1500 requests per hour)

## Asana API Rate Limits
Asana API มีข้อจำกัดในการเรียกใช้งาน (Rate Limits) เพื่อป้องกันการใช้งานที่เกินขีดจำกัด ซึ่งอาจส่งผลให้การเรียก API ถูกบล็อกหรือถูกปฏิเสธ
- **ข้อจำกัดทั่วไป**: Asana API อนุญาตให้เรียกใช้งานได้สูงสุด 1500 ครั้งต่อชั่วโมงต่อผู้ใช้ (user) หรือแอปพลิเคชัน (application)
- **การจัดการ Rate Limits**: ในโปรเจ็คนี้ มีการจัดการ Rate Limits โดยการใช้เทคนิคการหน่วงเวลา (throttling    ) และการทำงานแบบแบตช์ (batching) เพื่อให้แน่ใจว่าไม่เกินขีดจำกัดที่กำหนดไว้
- **การตรวจสอบข้อผิดพลาด**: เมื่อเรียก Asana API หากได้รับข้อผิดพลาดที่เกี่ยวข้องกับ Rate Limits (เช่น HTTP status code 429) ระบบจะทำการหน่วงเวลาและลองใหม่อีกครั้งหลังจากเวลาที่กำหนด
- **การบันทึกข้อมูลการเรียก API**: มีการบันทึกข้อมูลการเรียก API เพื่อวิเคราะห์และปรับปรุงการใช้งานในอนาคต
- **การแจ้งเตือน**: หากมีการเรียก API เกินขีดจำกัด ระบบจะมีการแจ้งเตือนผ่านทางล็อกหรืออีเมล เพื่อให้ผู้ดูแลระบบทราบและดำเนินการแก้ไข
- **การทดสอบ**: มีการทดสอบระบบอย่างสม่ำเสมอเพื่อให้แน่ใจว่าการจัดการ Rate Limits ทำงานได้อย่างถูกต้องและมีประสิทธิภาพ

## Asana API Usage in this Project
### API Endpoints Used
- `GET /projects/{project_gid}/sections`: ดึงรายการส่วน (Section) ทั้งหมดในโปรเจ็คที่ระบุ
- `GET /tasks/{task_gid}/subtasks?opt_fields=assignee,completed_at,followers`: ดึงรายการงานย่อยที่เชื่อมโยงกับงานหลัก (Task) พร้อมข้อมูลผู้รับผิดชอบและผู้ติดตาม
- `GET /users/{user_gid}`: ดึงข้อมูลผู้ใช้ตาม GID
- `GET /sections/{section_gid}/tasks`: ดึงรายการงานในแต่ละส่วน (Section) ของโปรเจ็ค
- `GET /teams/{team_gid}/users?opt_fields=email,name`: ดึงรายการผู้ใช้ในทีม ที่มีอีเมลและชื่อ จะเก็บไว้ในตาราง Assignee
### Authentication
- ใช้ Personal Access Token (PAT) ในการยืนยันตัวตน โดยส่งผ่านใน Header ของคำขอ HTTP `Authorization: Bearer {ASANA_TOKEN}`

## MCP (Model Context Protocol)
- ใช้ MCP Postgres สำหรับอ่านข้อมูลเท่านั้น โดยมี Tool `#query` สำหรับการดึงข้อมูลจากฐานข้อมูล PostgreSQL

## End to End Testing
- ใช้ Playwright สำหรับการทดสอบแบบ End to End (E2E) เพื่อให้แน่ใจว่าเว็บแอปทำงานได้ตามที่คาดหวัง
- การทดสอบครอบคลุมฟีเจอร์ต่างๆ เช่น การแสดงรายงาน, การกรองข้อมูล, การจัดเรียงข้อมูล, และการนำเข้าข้อมูล
- สคริปต์การทดสอบจะถูกเก็บไว้ในโฟลเดอร์ `tests/e2e/`
- การทดสอบจะถูกเรียกใช้ผ่านคำสั่ง `pnpm run test:e2e`