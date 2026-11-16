import { lazy } from "react";
import { SCHOOL_PERMISSION as P } from "@/mockup/columns/sessionColumns";
import EventSkeleton from "@/components/skeleton/EventSkeleton";
import DashboardSkeleton from "@/components/skeleton/DashboardSkeleton";
import MoreAnnouncements from "@/pages/announcement/MoreAnnouncements";
import AddSession from "@/pages/session/AddSession";
import Receipt from "@/pages/fees/Receipt";
import StudentFeesReport from "@/pages/student/StudentFeesReport";
import Event from "@/pages/events";
import Section from "@/pages/sections";

// The one place that lists the signed-in screens, who may open them and which school
// module they need. Order inside a group is the order they were declared in before.
//
//   roles       who may open it (omit = administrators and teachers alike)
//   permission  a school module that must be switched on (SCHOOL_PERMISSION)
//   component   a lazily loaded page; `props` are passed to it, `fallback` is shown while
//               it loads (default: a spinner)
//   element     a page that is loaded up front instead of lazily
//   children    nested routes (the parent page must render an <Outlet />)

const ADMIN = ["administrator"];
const TEACHER = ["teacher"];

const l = (loader) => lazy(loader);

export const lazyPages = {
  Dashboard: l(() => import("@/pages/Dashboard")),
  About: l(() => import("@/pages/About")),
  Profile: l(() => import("@/pages/profile")),
  Settings: l(() => import("@/pages/settings/Settings")),
  NotesBoard: l(() => import("@/pages/notes")),
  Uploads: l(() => import("@/pages/uploads")),
  Subjects: l(() => import("@/pages/subject")),

  Session: l(() => import("@/pages/session")),
  Sessions: l(() => import("@/pages/session/Sessions")),
  ViewSession: l(() => import("@/pages/session/ViewSession")),
  EditSession: l(() => import("@/pages/session/edit-form/EditSessionForm")),

  Level: l(() => import("@/pages/level")),
  LevelDashboard: l(() => import("@/pages/level/LevelDashboard")),
  CurrentLevel: l(() => import("@/pages/level/CurrentLevel")),
  NewAttendance: l(() => import("@/pages/level/NewAttendance")),
  AttendanceHistory: l(() => import("@/pages/level/AttendanceHistory")),
  AddCurrentSubjects: l(() => import("@/components/modals/AddCurrentSubjects")),

  Student: l(() => import("@/pages/student")),
  StudentHome: l(() => import("@/pages/student/StudentHome")),
  StudentAdd: l(() => import("@/pages/student/StudentAdd")),
  StudentEdit: l(() => import("@/pages/student/StudentEdit")),
  StudentView: l(() => import("@/pages/student/StudentView")),
  StudentDetails: l(() => import("@/pages/student/StudentDetails")),

  Teacher: l(() => import("@/pages/teacher")),
  TeacherHome: l(() => import("@/pages/teacher/TeacherHome")),
  TeacherView: l(() => import("@/pages/teacher/TeacherView")),
  TeacherEdit: l(() => import("@/pages/teacher/TeacherEdit")),
  TeacherAssignLevel: l(() => import("@/pages/teacher/TeacherAssignLevel")),
  TeacherAssignCourse: l(() => import("@/pages/teacher/TeacherAssignCourse")),
  TutorAssignedCourses: l(() => import("@/pages/teacher/assigned/TutorAssignedCourses")),
  TutorAssignedLevels: l(() => import("@/pages/teacher/assigned/TutorAssignedLevels")),

  Examination: l(() => import("@/pages/examination")),
  ExamsHome: l(() => import("@/pages/examination/ExamsHome")),
  ExamsLevel: l(() => import("@/pages/examination/ExamsLevel")),
  ExamsScore: l(() => import("@/pages/examination/ExamsScore")),
  ViewExamsReports: l(() => import("@/pages/examination/ViewExamsReports")),
  LevelExamScoreInput: l(() => import("@/pages/examination/LevelExamScoreInput")),
  UploadSingleSubject: l(() => import("@/pages/examination/UploadSingleSubject")),

  Fees: l(() => import("@/pages/fees")),
  FeeHome: l(() => import("@/pages/fees/FeeHome")),
  FeeNew: l(() => import("@/pages/fees/FeeNew")),
  FeeMakePayment: l(() => import("@/pages/fees/FeeMakePayment")),
  FeePaymentHistory: l(() => import("@/pages/fees/FeePaymentHistory")),
  StudentFeesHistory: l(() => import("@/pages/fees/StudentFeesHistory")),
  LevelFeeInformation: l(() => import("@/pages/fees/LevelFeeInformation")),

  SMS: l(() => import("@/pages/sms")),
  SMSHome: l(() => import("@/pages/sms/SMSHome")),
  SMSNew: l(() => import("@/pages/sms/SMSNew")),

  User: l(() => import("@/pages/user")),
  UserHome: l(() => import("@/pages/user/UserHome")),
  UserAdd: l(() => import("@/pages/user/UserAdd")),
  UserView: l(() => import("@/pages/user/UserView")),
  UserEdit: l(() => import("@/pages/user/UserEdit")),
  UserPermissions: l(() => import("@/pages/user/UserPermissions")),

  MoreEvents: l(() => import("@/pages/events/MoreEvents")),
  EventHome: l(() => import("@/pages/events/EventHome")),
  NewEvent: l(() => import("@/pages/events/NewEvent")),
  ViewEvent: l(() => import("@/pages/events/ViewEvent")),
  EditEvent: l(() => import("@/pages/events/EditEvent")),

  Course: l(() => import("@/pages/course")),
  CourseHome: l(() => import("@/pages/course/CourseHome")),
  CourseLevel: l(() => import("@/pages/course/CourseLevel")),
  AssignedCourses: l(() => import("@/pages/course/AssignedCourses")),
  AssignedCoursesResults: l(() => import("@/pages/course/AssignedCoursesResults")),
};
const pg = lazyPages;

// Shown inside the app shell, after sign-in and choosing a school session.
export const shellRoutes = [
  { index: true, component: pg.Dashboard, fallback: <DashboardSkeleton /> },
  { path: "/about", component: pg.About },

  // ---- administrators and teachers
  { path: "/announcements", permission: P.ANNOUNCEMENTS, roles: ["administrator", "teacher"], component: MoreAnnouncements, fallback: <EventSkeleton /> },
  { path: "/profile", roles: ["administrator", "teacher"], component: pg.Profile, props: { path: "/profile" } },
  { path: "/notes", permission: P.NOTES_BOARD, roles: ["administrator", "teacher"], component: pg.NotesBoard },

  // ---- administrators
  {
    path: "/session", roles: ADMIN, component: pg.Session,
    children: [
      { index: true, component: pg.Sessions },
      { path: "new", element: <AddSession /> },
      { path: ":id", component: pg.ViewSession },
      { path: ":id/edit", component: pg.EditSession },
    ],
  },
  { path: "/departments-houses", roles: ADMIN, permission: P.DEPARTMENTS_HOUSES, element: <Section /> },
  {
    path: "level", roles: ADMIN, component: pg.Level,
    children: [
      { index: true, component: pg.LevelDashboard },
      { path: ":id", component: pg.CurrentLevel },
      { path: ":id/courses", component: pg.AddCurrentSubjects },
      { path: ":id/attendance", component: pg.NewAttendance, props: { to: "/level/current" } },
      { path: ":id/history", component: pg.AttendanceHistory, props: { section: "level" } },
    ],
  },
  { path: "subject", roles: ADMIN, component: pg.Subjects },
  {
    path: "/student", roles: ADMIN, component: pg.Student,
    children: [
      { index: true, component: pg.StudentHome },
      { path: "new", component: pg.StudentAdd },
      { path: "edit", component: pg.StudentEdit },
      { path: "view", component: pg.StudentView },
      { path: "view/:studentId", component: pg.StudentDetails },
      { path: "view/:studentId/fees", element: <StudentFeesReport /> },
    ],
  },
  {
    path: "/teacher", roles: ADMIN, component: pg.Teacher,
    children: [
      { index: true, component: pg.TeacherHome },
      { path: ":id", component: pg.TeacherView },
      { path: ":id/edit", component: pg.TeacherEdit },
      { path: ":id/levels", component: pg.TeacherAssignLevel },
      { path: ":id/courses", component: pg.TeacherAssignCourse },
      { path: "courses", component: pg.TutorAssignedCourses },
      { path: "levels", component: pg.TutorAssignedLevels },
    ],
  },
  {
    path: "/examination", roles: ADMIN, component: pg.Examination,
    children: [
      { index: true, component: pg.ExamsHome },
      { path: ":levelId", component: pg.ExamsLevel, props: { type: "examination" } },
      { path: ":levelId/student", component: pg.ExamsScore },
      { path: ":levelId/reports", component: pg.ViewExamsReports },
      { path: ":levelId/upload", component: pg.LevelExamScoreInput },
    ],
  },
  {
    path: "/fee", roles: ADMIN, permission: P.SCHOOL_FEES, component: pg.Fees,
    children: [
      { index: true, component: pg.FeeHome },
      { path: "new", component: pg.FeeNew },
      { path: "payment", component: pg.FeeMakePayment },
      { path: "history", component: pg.FeePaymentHistory },
      { path: "payment/:student", component: pg.StudentFeesHistory },
      { path: "level", component: pg.LevelFeeInformation },
      { path: "receipt", element: <Receipt /> },
      { path: "receipt/:invoice", element: <Receipt /> },
    ],
  },
  {
    path: "/messages", roles: ADMIN, permission: P.MESSAGES, component: pg.SMS,
    children: [
      { index: true, component: pg.SMSHome },
      { path: "new", component: pg.SMSNew },
    ],
  },
  { path: "/uploads", roles: ADMIN, permission: P.DATA_UPLOADS, component: pg.Uploads },
  { path: "/settings", roles: ADMIN, component: pg.Settings },
  {
    path: "/users", roles: ADMIN, permission: P.USERS, component: pg.User,
    children: [
      { index: true, component: pg.UserHome },
      { path: "new", component: pg.UserAdd },
      { path: ":id", component: pg.UserView },
      { path: ":id/edit", component: pg.UserEdit },
      { path: ":id/permissions", component: pg.UserPermissions },
    ],
  },
  {
    path: "/events", roles: ADMIN, permission: P.EVENTS, element: <Event />,
    children: [
      { index: true, component: pg.EventHome },
      { path: "new", component: pg.NewEvent },
      { path: ":id", component: pg.ViewEvent },
      { path: ":id/edit", component: pg.EditEvent },
    ],
  },

  // ---- teachers
  {
    path: "/course", roles: TEACHER, component: pg.Course,
    children: [
      { index: true, component: pg.CourseHome },
      { path: "assign", component: pg.AssignedCourses },
      { path: "assign/:levelId", component: pg.AssignedCoursesResults },
      { path: "assign/:levelId/upload", component: pg.UploadSingleSubject },
      { path: "level", component: pg.CourseLevel },
      { path: "level/:levelId", component: pg.ExamsLevel, props: { type: "course/level" } },
      { path: "level/:levelId/reports", component: pg.ViewExamsReports },
      { path: "level/:levelId/student", component: pg.ExamsScore },
      { path: "level/:levelId/upload", component: pg.LevelExamScoreInput },
      { path: "level/:id/attendance", component: pg.NewAttendance, props: { to: "course/level" } },
      { path: "level/:id/history", component: pg.AttendanceHistory, props: { section: "course/level" } },
    ],
  },
  { path: "/events", roles: TEACHER, component: pg.MoreEvents, fallback: <EventSkeleton /> },
  { path: "/events/:id", roles: TEACHER, component: pg.ViewEvent },
];
