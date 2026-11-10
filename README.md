# stock mornitor

ระบบมอนิเตอร์สีโรงงาน พัฒนาต่อจาก Paint Monitor V2 เดิม: HTML/CSS/Vanilla JS + GitHub Pages + Google Apps Script + Google Sheets ไม่มีเซิร์ฟเวอร์เสียเงิน

## ทดลองในเครื่อง

เปิด index.html หรือรัน `python -m http.server 8765` แล้วเปิด http://localhost:8765 เมื่อ config.js เว้น apiUrl ว่างจะเป็น Demo Mode ข้อมูลอยู่ใน localStorage ของเบราว์เซอร์ ไม่ส่งขึ้น Google และไม่ใช้ร่วมกันระหว่างอุปกรณ์ ข้อมูลเดโมเดิมยังอ่านได้

สามหน้า: ภาพรวมสต็อก/ยอดเบิกวันนี้/แผน/กราฟ 7 วัน, เบิก–รับ–ประวัติพร้อมตัวกรองวันที่และ CSV, จัดการสูตรสีและวัตถุดิบ A/B/C

สูตรตัวอย่าง Model D03B / GD7 11BK01 คือ 100:15:100 เลือกหน่วย g แล้วกรอก A=1000 หรือ B=150 หรือ C=1000 ต้องได้ชุด 1000/150/1000 เหมือนกัน ปิดการผูกสูตรเพื่อกรอกปริมาณจริงแต่ละช่องได้โดยสูตรมาตรฐานไม่เปลี่ยน

รูปแต่ละส่วน A PAINT / B HARDENER / C THINNER ถ่ายหรือแนบแยกกัน ย่อด้านยาวสูงสุด 512 px รักษาสัดส่วน บีบอัด JPEG จน Base64 **ทั้ง data URL ไม่เกิน 40,000 ตัวอักษร** ต่อภาพ และเก็บคนละเซลล์ หากยังเกินจะลดคุณภาพ/มิติเพิ่ม 40,000 เป็นงบภายในที่เว้นระยะจากข้อจำกัดเซลล์ ไม่ใช่ขนาดไบนารี 40 KB ภาพที่ยังไม่อัปโหลดแสดง placeholder

## Run Code.gs ให้สร้างตารางพร้อมข้อมูลดัมมี่

1. สร้าง Google Spreadsheet ใหม่ชื่อ stock mornitor
2. เปิด Extensions → Apps Script แทนเนื้อหา Code.gs ด้วยไฟล์ของโปรเจกต์
3. เลือกฟังก์ชัน **setup** กด **Run** และอนุญาตสิทธิ์บัญชีเจ้าของ
4. ระบบจำ Spreadsheet ID ที่ผูกไว้ สร้างตาราง หัวคอลัมน์ และข้อมูลตัวอย่างพร้อมประวัติทดสอบครั้งแรก

| ชีต | หน้าที่ |
|---|---|
| COLORS | สูตร รุ่น ชื่อ รหัส ภาพหลัก และชื่อ/รหัส/ภาพ A/B/C แยกคอลัมน์ |
| STOCK | ยอดตั้งต้นสีผสมหรือวัตถุดิบแต่ละส่วน |
| TRANSACTIONS | ledger รับ/เบิก ปริมาณจริง สูตรขณะทำรายการ request ID และบัญชีผู้บันทึก |
| PRODUCTION_PLAN | แผนแยกวันและสูตรสี |
| SETTINGS | ตั้งค่าฐานข้อมูล |
| AUDIT | ผู้เปลี่ยนข้อมูล ประเภทงาน และ record ID |

**setup() รันซ้ำได้ ไม่ล้างข้อมูลและไม่เพิ่มตัวอย่างซ้ำ** ถ้ามีข้อมูลเดิมจะไม่เติมดัมมี่ทับ การอัปเกรดเพิ่มคอลัมน์ท้ายตารางและเก็บข้อมูลเดิมไว้ หากหัวคอลัมน์ไม่ตรงจะหยุดแจ้งข้อผิดพลาด ควรสำรองชีตก่อนอัปเกรด หากใช้ standalone script ให้ตั้ง SPREADSHEET_ID ก่อนรัน ไม่เปิด setup ผ่าน API

ก่อนใช้จริงให้ตรวจนับยอดและเปลี่ยนข้อมูลตัวอย่าง แนะนำใช้ชีตทดสอบแยกจากชีตจริง

## บัญชีและสิทธิ์

สร้าง OAuth client ID แบบ Web application ใน Google Cloud ตั้งค่า Google Auth Platform/Consent Screen และเพิ่ม Authorized JavaScript origins เช่น https://yourname.github.io และ http://localhost:8765 (ไม่มี path ชื่อ repo และไม่มี slash ท้าย) หาก Consent Screen อยู่ Testing ให้เพิ่มบัญชีทดสอบ

ใน Apps Script → Project Settings → Script Properties ตั้งค่า:

| Property | ค่า |
|---|---|
| SPREADSHEET_ID | setup จำให้เมื่อเรียกจากชีตที่ผูกไว้; standalone ต้องใส่เอง |
| GOOGLE_CLIENT_ID | 123456789-xxxxx.apps.googleusercontent.com |
| ALLOWED_ORIGINS | `["https://yourname.github.io","http://localhost:8765"]` |
| USER_ROLES | `{"owner@example.com":"admin","staff@example.com":"operator","viewer@example.com":"viewer"}` |

ใช้ email ตัวพิมพ์เล็ก viewer ดูข้อมูล, operator รับ/เบิกได้, admin เพิ่มและแก้สูตรได้ บัญชีที่ไม่อยู่ในรายการเข้าอ่านข้อมูลจริงไม่ได้ เซิร์ฟเวอร์ตรวจ ID token, audience, issuer, expiry และ verified email ชื่อหน้างานกับบัญชีที่ล็อกอินเก็บแยกกัน ไม่เก็บ token ใน config/localStorage และไม่ฝัง secret ใน frontend

## Deploy Apps Script และ GitHub Pages

1. Apps Script → Deploy → New deployment → Web app
2. Execute as **Me** และ Who has access **Anyone** เพื่อให้ form POST เข้าถึง handler ได้; API ตรวจ Google ID token และ USER_ROLES ของตัวเอง หากนโยบายองค์กรไม่อนุญาต Anyone ต้องให้ผู้ดูแลอนุญาตวิธีนี้ก่อน
3. คัดลอก URL ลงท้าย /exec ไม่ใช้ /dev
4. แก้ config.js เฉพาะค่าที่เป็นสาธารณะ:

```js
window.PAINT_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  googleClientId: '123456789-xxxxx.apps.googleusercontent.com'
};
```

5. อัปโหลด index.html, styles.css, app.js, core.js, config.js เข้า GitHub repository เปิด Settings → Pages → Deploy from a branch → main / root ตามโฟลเดอร์จริง
6. เปิด URL Pages ลงชื่อเข้าใช้บัญชีที่อยู่ใน USER_ROLES แล้วทดสอบรับเข้า/เบิก ตรวจชีตและรีเฟรชอีกอุปกรณ์
7. เมื่อแก้ Code.gs ให้ Manage deployments → Edit → New version เพื่ออัปเดต /exec

ไม่อัปโหลด backup/, token หรือข้อมูลลับ Script Properties อยู่ฝั่ง Apps Script เท่านั้น

## การเชื่อมต่อและข้อผิดพลาด

ส่ง HTML form POST ไป Apps Script ผ่าน iframe แล้วรับผลจริงด้วย postMessage ไป origin ที่อนุญาต หน้าเว็บตรวจ Google response origin และ request ID สุ่มก่อนรับผล ไม่ใช้ no-cors และไม่ต้องอ่าน fetch response ข้าม origin

หาก origin/deployment/สิทธิ์ผิด หรือ browser/องค์กรบล็อก iframe จะแสดงข้อผิดพลาดหรือหมดเวลา ไม่ถือว่าบันทึกสำเร็จ ไม่สลับไปเขียนเดโมแทน หากหมดเวลาหลังส่งคำขอ ผลอาจบันทึกแล้ว ให้ retry ด้วย request ID เดิมเพื่อป้องกันตัดสต็อกซ้ำ ต้องตรวจการเชื่อมต่อกับ GitHub Pages และ deployment จริงหลังตั้งค่า; mock tests ในเครื่องไม่ยืนยันนโยบาย Google ของบัญชีคุณ

รายการเบิก/รับและการบันทึกสูตรสีที่ยังไม่ยืนยันผลจะจำข้อมูลกับเลขคำขอเดิมไว้ในเบราว์เซอร์ แม้โหลดหน้าใหม่ ให้ใช้ปุ่มส่งรายการเดิมอีกครั้ง หาก token หมดอายุให้ลงชื่อเข้าใช้ใหม่แล้วลองด้วยเลขเดิม การยกเลิกสูตรค้างลบเพียงข้อมูลลองส่งในเครื่อง อาจต้องให้ผู้ดูแลตรวจข้อมูลที่เขียนสำเร็จบางส่วนก่อนสร้างใหม่

## ความหมายข้อมูลและข้อจำกัด

- เก็บน้ำหนักเป็น kg หน้าจอเลือก g/kg สูตรเป็นสัดส่วนโดยน้ำหนัก
- ข้อมูลเดิมยังเป็นสีผสมรวม ไม่เดายอด A/B/C และไม่ตัดประวัติเก่าซ้ำตอนอัปเกรด
- สูตรใหม่เลือก A/B/C แยก รับเข้าเฉพาะตัวได้ ตัดตามปริมาณจริง แม้ผู้ใช้ปรับต่างจากสูตร
- ยอดวัตถุดิบแยกตามสูตร ยังไม่มีคลังร่วมข้ามหลายสูตรแม้ใช้รหัส Hardener/Thinner เหมือนกัน
- แก้สูตรไม่ทับยอดสต็อก ปรับยอดผ่านรับ/เบิก การเปลี่ยน stock mode ของสูตรเดิมต้องมีการตรวจนับและย้ายข้อมูลชัดเจน จึงไม่เปลี่ยนอัตโนมัติ
- STOCK เป็นยอดตั้งต้น ยอดปัจจุบันคำนวณจากยอดตั้งต้น + TRANSACTIONS ledger ใช้ LockService และ request ID ป้องกันเขียนพร้อมกัน/รายการซ้ำ ห้ามแก้หรือลบ ledger เอง
- PRODUCTION_PLAN ของวันนี้ตามเวลาไทยรวมแผนตาม colorId เมื่อมีรายการจะใช้แทนแผนมาตรฐานจาก COLORS ถ้าไม่มีใช้ plan ประจำสูตร
- ประวัติใหม่มีสูตร snapshot และปริมาณ A/B/C ประวัติเก่าจะแสดงเฉพาะข้อมูลที่มีจริง
- AUDIT เก็บผู้ทำงานและ record ID; ธุรกรรมมี snapshot ในตัว การแก้ metadata ยังไม่ใช่ประวัติ full before/after ทุกฟิลด์
- การตรวจ ID token ใช้ Google tokeninfo ซึ่งมี dependency/โควตาภายนอก เหมาะเริ่มทดสอบระบบ หากเพิ่มผู้ใช้มากให้ประเมินโควตา Apps Script และแนวทางตรวจ token ที่ Google แนะนำ

## ตรวจงาน

```powershell
node --test tests/core.test.js tests/backend.test.js
node --check app.js
node --check core.js
```

backend tests จำลองบริการ Google Apps Script ต้องทดสอบจริงหลัง deploy โดยเฉพาะล็อกอิน การส่งรูป สิทธิ์ การบันทึก และรีเฟรชหลายอุปกรณ์

ก่อนแก้โค้ดทุกครั้งรัน `cmd /c python backup.py` จาก Main Project และตรวจ ZIP ใน backup/ อ่าน D:\NAMCHAI\cost v3\DevRoule.md และต่อท้าย note.md พร้อมวันเวลา ไม่เปลี่ยน Git ของโฟลเดอร์แม่

อ้างอิง: [Apps Script iframe](https://developers.google.com/apps-script/reference/html/x-frame-options-mode), [HTML sandbox](https://developers.google.com/apps-script/guides/html/restrictions), [Google ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [ข้อจำกัด Google Sheets](https://support.google.com/drive/answer/37603)
