export interface User {
  id: number;
  name: string;
  email: string;
  role: "Student" | "Librarian" | "Admin";
  isActive: boolean;
}
export interface Session {
  accessToken: string;
  expiresAt: string;
  user: User;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Book {
  id: number;
  title: string;
  author: string;
  category: string;
  publishYear: number | null;
  openLibraryKey: string | null;
  coverId: number | null;
  isActive: boolean;
  version: number;
  totalCopies: number;
  availableCopies: number;
}
export interface Copy {
  id: number;
  accessionNumber: string;
  shelf: string;
  available: boolean;
  hasHistory: boolean;
}
export interface BookDetail extends Book {
  copies: Copy[];
}
export interface Loan {
  id: number;
  bookId: number;
  bookTitle: string;
  author: string;
  accessionNumber: string;
  shelf: string;
  borrowerId: number;
  borrowerName: string;
  status:
    | "Requested"
    | "Ready"
    | "CheckedOut"
    | "Returned"
    | "Rejected"
    | "Cancelled";
  requestedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  decisionNote: string | null;
  version: number;
  isOverdue: boolean;
}
export interface Summary {
  titles: number;
  availableCopies: number;
  pending: number;
  ready: number;
  checkedOut: number;
  overdue: number;
}
export interface ExternalBook {
  key: string;
  title: string;
  author: string;
  publishYear: number | null;
  coverId: number | null;
}
