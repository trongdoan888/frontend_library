export const users = [
  { id: 1, username: "admin", fullName: "Nguyễn Văn A", role: "Quản trị viên" },
  { id: 2, username: "thuvien", fullName: "Trần Thị B", role: "Nhân viên" },
  { id: 3, username: "docgia", fullName: "Lê Văn C", role: "Độc giả" },
];

export const books = [
  { id: 1, title: "Lập trình React", author: "Nguyễn Hoàng", genre: "Công nghệ" },
  { id: 2, title: "Tiếng Anh giao tiếp", author: "Phạm Minh", genre: "Giáo dục" },
  { id: 3, title: "Sử Việt", author: "Nguyễn Trần", genre: "Lịch sử" },
];

export const authors = [
  { id: 1, name: "Nguyễn Hoàng", country: "Việt Nam" },
  { id: 2, name: "Phạm Minh", country: "Việt Nam" },
  { id: 3, name: "Nguyễn Trần", country: "Việt Nam" },
];

export const genres = [
  { id: 1, name: "Công nghệ" },
  { id: 2, name: "Giáo dục" },
  { id: 3, name: "Lịch sử" },
];

export const loans = [
  { id: 1, user: "Nguyễn Văn A", book: "Lập trình React", status: "Đã mượn", dueDate: "2026-08-20" },
  { id: 2, user: "Lê Văn C", book: "Sử Việt", status: "Đang trả", dueDate: "2026-08-18" },
];
