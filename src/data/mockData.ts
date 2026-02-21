import { Student, Teacher, Notice, DashboardStats, User } from '@/types';

export const mockUsers: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@school.com', role: 'admin' },
  { id: '2', name: 'Mr. Sharma', email: 'sharma@school.com', role: 'teacher' },
  { id: '3', name: 'Arjun Sharma', email: 'arjun@school.com', role: 'student' },
  { id: '4', name: 'Rajesh Sharma', email: 'rajesh@school.com', role: 'parent' },
];

export const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Emma Wilson',
    email: 'emma@student.school.com',
    class: '10th',
    section: 'A',
    rollNumber: '101',
    parentId: '4',
    attendance: 95,
    performance: 88,
  },
  {
    id: '2',
    name: 'James Brown',
    email: 'james@student.school.com',
    class: '10th',
    section: 'A',
    rollNumber: '102',
    parentId: '5',
    attendance: 88,
    performance: 92,
  },
  {
    id: '3',
    name: 'Sophia Davis',
    email: 'sophia@student.school.com',
    class: '10th',
    section: 'B',
    rollNumber: '103',
    parentId: '6',
    attendance: 92,
    performance: 85,
  },
  {
    id: '4',
    name: 'Oliver Martinez',
    email: 'oliver@student.school.com',
    class: '9th',
    section: 'A',
    rollNumber: '201',
    parentId: '7',
    attendance: 78,
    performance: 75,
  },
  {
    id: '5',
    name: 'Ava Johnson',
    email: 'ava@student.school.com',
    class: '9th',
    section: 'B',
    rollNumber: '202',
    parentId: '8',
    attendance: 98,
    performance: 95,
  },
  {
    id: '6',
    name: 'William Taylor',
    email: 'william@student.school.com',
    class: '11th',
    section: 'A',
    rollNumber: '301',
    parentId: '9',
    attendance: 85,
    performance: 82,
  },
];

export const mockTeachers: Teacher[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@school.com',
    subject: 'Mathematics',
    classes: ['10th A', '10th B', '11th A'],
    phone: '+1 234 567 8901',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@school.com',
    subject: 'Physics',
    classes: ['11th A', '11th B', '12th A'],
    phone: '+1 234 567 8902',
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.chen@school.com',
    subject: 'Chemistry',
    classes: ['9th A', '10th A', '11th B'],
    phone: '+1 234 567 8903',
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@school.com',
    subject: 'English',
    classes: ['9th A', '9th B', '10th A', '10th B'],
    phone: '+1 234 567 8904',
  },
  {
    id: '5',
    name: 'David Wilson',
    email: 'david.wilson@school.com',
    subject: 'Biology',
    classes: ['11th A', '12th A', '12th B'],
    phone: '+1 234 567 8905',
  },
];

export const mockNotices: Notice[] = [
  {
    id: '1',
    title: 'Annual Sports Day',
    content: 'The annual sports day will be held on March 15th. All students are expected to participate.',
    date: '2024-03-01',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Parent-Teacher Meeting',
    content: 'PTM scheduled for this Saturday from 10 AM to 2 PM.',
    date: '2024-02-28',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Holiday Notice',
    content: 'School will remain closed on March 8th on account of Holi festival.',
    date: '2024-02-25',
    priority: 'low',
  },
  {
    id: '4',
    title: 'Exam Schedule Released',
    content: 'Final examination schedule has been released. Please check the notice board.',
    date: '2024-02-20',
    priority: 'high',
  },
];

export const mockDashboardStats: DashboardStats = {
  totalStudents: 1250,
  totalTeachers: 85,
  totalParents: 980,
  averageAttendance: 92,
  pendingFees: 45000,
  upcomingEvents: 8,
};

export const attendanceData = [
  { month: 'Jan', attendance: 94 },
  { month: 'Feb', attendance: 91 },
  { month: 'Mar', attendance: 93 },
  { month: 'Apr', attendance: 89 },
  { month: 'May', attendance: 95 },
  { month: 'Jun', attendance: 92 },
];

export const performanceData = [
  { subject: 'Math', score: 85 },
  { subject: 'Physics', score: 78 },
  { subject: 'Chemistry', score: 82 },
  { subject: 'English', score: 90 },
  { subject: 'Biology', score: 75 },
];
