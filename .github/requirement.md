# Proposal
ฉันกำลังสร้างโปรเจ็คสำหรับแสดงรายงานการทำงานให้กับบุคลากรในองค์กร จะมีกระบวนการเก็บข้อมูลดังนี้

อ่านข้อมูลจาก API ของ Asana โดยฉันเก็บข้อมูลตัวแปร ENV ที่จำเป็นได้แก่ `ASANA_BASE_URL`, `ASANA_TOKEN`, `ASANA_PROJECT_ID`, `ASANA_TEAM_ID`

จะ path ที่จำเป็นได้แก่ 
1. Get sections in a project 
Path `/projects/{project_gid}/sections`
ตัวอย่างข้อมูล
```json
{
  "data": [
    {
      "gid": "1210348643511565",
      "name": "Executives",
      "resource_type": "section"
    },
    {
      "gid": "1210348643511568",
      "name": "Research and Academic Services",
      "resource_type": "section"
    },
    {
      "gid": "1210348643511569",
      "name": "Technology Commercialisation",
      "resource_type": "section"
    },
    {
      "gid": "1210348643511570",
      "name": "Entrepreneurial Ecosystem",
      "resource_type": "section"
    },
    {
      "gid": "1210348643511571",
      "name": "Administration",
      "resource_type": "section"
    },
    {
      "gid": "1210348643511572",
      "name": "Strategy and Corporate Communications",
      "resource_type": "section"
    },
    {
      "gid": "1210348643511585",
      "name": "Accelerator",
      "resource_type": "section"
    }
  ]
}
```
แต่ละ section จะมี `gid` ที่ไม่ซ้ำกัน และจะแทนความหมายของกลุ่มงานในองค์กร
2.