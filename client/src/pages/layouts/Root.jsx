/* eslint-disable react/prop-types */
import React, {
  lazy,
  Suspense,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import Loader from "../../config/Loader";
import Shell from "../Shell";
import Login from "../Login";
import PageNotFound from "../PageNotFound";
import MoreAnnouncements from "../announcement/MoreAnnouncements";
import DashboardSkeleton from "@/components/skeleton/DashboardSkeleton";
import EventSkeleton from "@/components/skeleton/EventSkeleton";
import ProtectedRoute from "./ProtectedRoute";
import AddSession from "../session/AddSession";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import Receipt from "../fees/Receipt";
import StudentFeesReport from "../student/StudentFeesReport";

// Grouped lazy imports by feature
const SessionComponents = {
  Sessions: lazy(() => import("../session/Sessions")),
  ViewSession: lazy(() => import("../session/ViewSession")),
  EditSessionForm: lazy(() => import("../session/edit-form/EditSessionForm")),
};

const FeeComponents = {
  LevelFeeInformation: lazy(() => import("../fees/LevelFeeInformation")),
  FeeNew: lazy(() => import("../fees/FeeNew")),
  FeeMakePayment: lazy(() => import("../fees/FeeMakePayment")),
  FeePaymentHistory: lazy(() => import("../fees/FeePaymentHistory")),
  StudentFeesHistory: lazy(() => import("../fees/StudentFeesHistory")),
  FeeHome: lazy(() => import("../fees/FeeHome")),
};

const TeacherComponents = {
  Teacher: lazy(() => import("../teacher")),
  TeacherView: lazy(() => import("../teacher/TeacherView")),
  TeacherEdit: lazy(() => import("../teacher/TeacherEdit")),
  TeacherHome: lazy(() => import("../teacher/TeacherHome")),
  TeacherAssignLevel: lazy(() => import("../teacher/TeacherAssignLevel")),
  TeacherAssignCourse: lazy(() => import("../teacher/TeacherAssignCourse")),
  TutorAssignedCourses: lazy(() =>
    import("../teacher/assigned/TutorAssignedCourses")
  ),
  TutorAssignedLevels: lazy(() =>
    import("../teacher/assigned/TutorAssignedLevels")
  ),
};

const StudentComponents = {
  Student: lazy(() => import("../student")),
  StudentHome: lazy(() => import("../student/StudentHome")),
  StudentAdd: lazy(() => import("../student/StudentAdd")),
  StudentEdit: lazy(() => import("../student/StudentEdit")),
  StudentView: lazy(() => import("../student/StudentView")),
  StudentDetails: lazy(() => import("../student/StudentDetails")),
};

const UserComponents = {
  User: lazy(() => import("../user")),
  UserHome: lazy(() => import("../user/UserHome")),
  UserAdd: lazy(() => import("../user/UserAdd")),
  UserView: lazy(() => import("../user/UserView")),
  UserEdit: lazy(() => import("../user/UserEdit")),
  UserPermissions: lazy(() => import("../user/UserPermissions")),
};

const ExaminationComponents = {
  Examination: lazy(() => import("../examination")),
  ExamsHome: lazy(() => import("../examination/ExamsHome")),
  ExamsLevel: lazy(() => import("../examination/ExamsLevel")),
  ExamsScore: lazy(() => import("../examination/ExamsScore")),
  ViewExamsReports: lazy(() => import("../examination/ViewExamsReports")),
  LevelExamScoreInput: lazy(() => import("../examination/LevelExamScoreInput")),
  UploadSingleSubject: lazy(() => import("../examination/UploadSingleSubject")),
};

const CourseComponents = {
  Course: lazy(() => import("../course")),
  CourseHome: lazy(() => import("../course/CourseHome")),
  CourseLevel: lazy(() => import("../course/CourseLevel")),
  AssignedCourses: lazy(() => import("../course/AssignedCourses")),
  AssignedCoursesResults: lazy(() =>
    import("../course/AssignedCoursesResults")
  ),
};

const EventComponents = {
  MoreEvents: lazy(() => import("../events/MoreEvents")),
  EventHome: lazy(() => import("../events/EventHome")),
  NewEvent: lazy(() => import("../events/NewEvent")),
  ViewEvent: lazy(() => import("../events/ViewEvent")),
  EditEvent: lazy(() => import("../events/EditEvent")),
};

const OtherComponents = {
  Subject_Grade: lazy(() => import("../subject")),
  NewAttendance: lazy(() => import("../level/NewAttendance")),
  NotesBoard: lazy(() => import("../notes")),
  Profile: lazy(() => import("../profile")),
  SMS: lazy(() => import("../sms")),
  SMSHome: lazy(() => import("../sms/SMSHome")),
  SMSNew: lazy(() => import("../sms/SMSNew")),
  Dashboard: lazy(() => import("../Dashboard")),
  Session: lazy(() => import("../session")),
  Fees: lazy(() => import("../fees")),
  UserHome: lazy(() => import("../user/UserHome")),
  About: lazy(() => import("../About")),
  Settings: lazy(() => import("../settings/Settings")),
  SchoolSession: lazy(() => import("../SchoolSession")),
  Platform: lazy(() => import("../platform")),
  Level: lazy(() => import("../level")),
  LevelDashboard: lazy(() => import("../level/LevelDashboard")),
  CurrentLevel: lazy(() => import("../level/CurrentLevel")),
  Uploads: lazy(() => import("../uploads")),
  AttendanceHistory: lazy(() => import("../level/AttendanceHistory")),
  AddCurrentSubjects: lazy(() =>
    import("../../components/modals/AddCurrentSubjects")
  ),
};

// Events (non-lazy imports)
import Event from "../events";
import Section from "../sections";
import { SCHOOL_PERMISSION } from "@/mockup/columns/sessionColumns";
import PageTitle from "@/components/items/PageTitle";

// Reusable Suspense wrapper component
const LazyComponent = ({
  component: Component,
  fallback = <Loader />,
  ...rest
}) => (
  <>
    <PageTitle />
    <Suspense fallback={fallback}>
      <Component {...rest} />
    </Suspense>
  </>
);

const Root = () => {
  const { user, school_info } = useAuth();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  // Memoized event handlers to prevent recreating on every render
  const handleOnline = useCallback(() => {
    schoolSessionDispatch(alertSuccess("Connection Restored"));
  }, [schoolSessionDispatch]);

  const handleOffline = useCallback(() => {
    schoolSessionDispatch(
      alertError("Internet Connection Lost! Try reconnecting.")
    );
  }, [schoolSessionDispatch]);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Memoize route configurations based on user role
  const administratorRoutes = useMemo(() => {
    if (user?.role !== "administrator") return null;

    return (
      <>
        {/* Session Routes */}
        <Route
          element={<LazyComponent component={OtherComponents.Session} />}
          path="/session"
        >
          <Route
            index
            element={<LazyComponent component={SessionComponents.Sessions} />}
          />
          <Route path="new" element={<AddSession />} />
          <Route
            path=":id"
            element={
              <LazyComponent component={SessionComponents.ViewSession} />
            }
          />
          <Route
            path=":id/edit"
            element={
              <LazyComponent component={SessionComponents.EditSessionForm} />
            }
          />
        </Route>

        {/* Department & House Management */}
        {school_info?.permissions?.includes(
          SCHOOL_PERMISSION.DEPARTMENTS_HOUSES
        ) && <Route path="/departments-houses" element={<Section />} />}

        {/* Level Routes */}
        <Route
          element={<LazyComponent component={OtherComponents.Level} />}
          path="level"
        >
          <Route
            index
            element={
              <LazyComponent component={OtherComponents.LevelDashboard} />
            }
          />
          <Route
            path=":id"
            element={<LazyComponent component={OtherComponents.CurrentLevel} />}
          />
          <Route
            path=":id/courses"
            element={
              <LazyComponent component={OtherComponents.AddCurrentSubjects} />
            }
          />
          <Route
            path=":id/attendance"
            element={
              <LazyComponent
                component={OtherComponents.NewAttendance}
                to="/level/current"
              />
            }
          />
          <Route
            path=":id/history"
            element={
              <LazyComponent
                component={OtherComponents.AttendanceHistory}
                section="level"
              />
            }
          />
        </Route>

        {/* Subject Routes */}
        <Route
          path="subject"
          element={<LazyComponent component={OtherComponents.Subject_Grade} />}
        />

        {/* Student Routes */}
        <Route
          element={<LazyComponent component={StudentComponents.Student} />}
          path="/student"
        >
          <Route
            index
            element={
              <LazyComponent component={StudentComponents.StudentHome} />
            }
          />
          <Route
            path="new"
            element={<LazyComponent component={StudentComponents.StudentAdd} />}
          />
          <Route
            path="edit"
            element={
              <LazyComponent component={StudentComponents.StudentEdit} />
            }
          />
          <Route
            path="view"
            element={
              <LazyComponent component={StudentComponents.StudentView} />
            }
          />
          <Route
            path="view/:studentId"
            element={
              <LazyComponent component={StudentComponents.StudentDetails} />
            }
          />
          <Route path="view/:studentId/fees" element={<StudentFeesReport />} />
        </Route>

        {/* Teacher Routes */}
        <Route
          element={<LazyComponent component={TeacherComponents.Teacher} />}
          path="/teacher"
        >
          <Route
            index
            element={
              <LazyComponent component={TeacherComponents.TeacherHome} />
            }
          />
          <Route
            path=":id"
            element={
              <LazyComponent component={TeacherComponents.TeacherView} />
            }
          />
          <Route
            path=":id/edit"
            element={
              <LazyComponent component={TeacherComponents.TeacherEdit} />
            }
          />
          <Route
            path=":id/levels"
            element={
              <LazyComponent component={TeacherComponents.TeacherAssignLevel} />
            }
          />
          <Route
            path=":id/courses"
            element={
              <LazyComponent
                component={TeacherComponents.TeacherAssignCourse}
              />
            }
          />
          <Route
            path="courses"
            element={
              <LazyComponent
                component={TeacherComponents.TutorAssignedCourses}
              />
            }
          />
          <Route
            path="levels"
            element={
              <LazyComponent
                component={TeacherComponents.TutorAssignedLevels}
              />
            }
          />
        </Route>

        {/* Examination Routes */}
        <Route
          element={
            <LazyComponent component={ExaminationComponents.Examination} />
          }
          path="/examination"
        >
          <Route
            index
            element={
              <LazyComponent component={ExaminationComponents.ExamsHome} />
            }
          />
          <Route
            path=":levelId"
            element={
              <LazyComponent
                component={ExaminationComponents.ExamsLevel}
                type="examination"
              />
            }
          />
          <Route
            path=":levelId/student"
            element={
              <LazyComponent component={ExaminationComponents.ExamsScore} />
            }
          />
          <Route
            path=":levelId/reports"
            element={
              <LazyComponent
                component={ExaminationComponents.ViewExamsReports}
              />
            }
          />
          <Route
            path=":levelId/upload"
            element={
              <LazyComponent
                component={ExaminationComponents.LevelExamScoreInput}
              />
            }
          />
        </Route>

        {/* Fee Routes */}

        {school_info.permissions?.includes(SCHOOL_PERMISSION.SCHOOL_FEES) && (
          <Route
            element={<LazyComponent component={OtherComponents.Fees} />}
            path="/fee"
          >
            <Route
              index
              element={<LazyComponent component={FeeComponents.FeeHome} />}
            />
            <Route
              path="new"
              element={<LazyComponent component={FeeComponents.FeeNew} />}
            />
            <Route
              path="payment"
              element={
                <LazyComponent component={FeeComponents.FeeMakePayment} />
              }
            />
            <Route
              path="history"
              element={
                <LazyComponent component={FeeComponents.FeePaymentHistory} />
              }
            />
            <Route
              path="payment/:student"
              element={
                <LazyComponent component={FeeComponents.StudentFeesHistory} />
              }
            />
            <Route
              path="level"
              element={
                <LazyComponent component={FeeComponents.LevelFeeInformation} />
              }
            />
            <Route path="receipt" element={<Receipt />} />
          </Route>
        )}

        {/* Message Routes */}
        {school_info.permissions?.includes(SCHOOL_PERMISSION.MESSAGES) && (
          <Route
            element={<LazyComponent component={OtherComponents.SMS} />}
            path="/messages"
          >
            <Route
              index
              element={<LazyComponent component={OtherComponents.SMSHome} />}
            />
            <Route
              path="new"
              element={<LazyComponent component={OtherComponents.SMSNew} />}
            />
          </Route>
        )}

        {/* Other Routes */}
        {school_info.permissions?.includes(SCHOOL_PERMISSION.DATA_UPLOADS) && (
          <Route
            path="/uploads"
            element={<LazyComponent component={OtherComponents.Uploads} />}
          />
        )}
        <Route
          path="/settings"
          element={<LazyComponent component={OtherComponents.Settings} />}
        />

        {/* User Routes */}
        {school_info.permissions?.includes(SCHOOL_PERMISSION.USERS) && (
          <Route
            element={<LazyComponent component={UserComponents.User} />}
            path="/users"
          >
            <Route
              index
              element={<LazyComponent component={UserComponents.UserHome} />}
            />
            <Route
              path="new"
              element={<LazyComponent component={UserComponents.UserAdd} />}
            />
            <Route
              path=":id"
              element={<LazyComponent component={UserComponents.UserView} />}
            />
            <Route
              path=":id/edit"
              element={<LazyComponent component={UserComponents.UserEdit} />}
            />
            <Route
              path=":id/permissions"
              element={
                <LazyComponent component={UserComponents.UserPermissions} />
              }
            />
          </Route>
        )}
        {/* Event Routes */}
        {school_info.permissions?.includes(SCHOOL_PERMISSION.EVENTS) && (
          <Route element={<Event />} path="/events">
            <Route
              index
              element={<LazyComponent component={EventComponents.EventHome} />}
            />
            <Route
              path="new"
              element={<LazyComponent component={EventComponents.NewEvent} />}
            />
            <Route
              path=":id"
              element={<LazyComponent component={EventComponents.ViewEvent} />}
            />
            <Route
              path=":id/edit"
              element={<LazyComponent component={EventComponents.EditEvent} />}
            />
          </Route>
        )}
      </>
    );
  }, [user?.role]);

  const teacherRoutes = useMemo(() => {
    if (user?.role !== "teacher") return null;

    return (
      <>
        {/* Course Routes */}
        <Route
          element={<LazyComponent component={CourseComponents.Course} />}
          path="/course"
        >
          <Route
            index
            element={<LazyComponent component={CourseComponents.CourseHome} />}
          />
          <Route
            path="assign"
            element={
              <LazyComponent component={CourseComponents.AssignedCourses} />
            }
          />
          <Route
            path="assign/:levelId"
            element={
              <LazyComponent
                component={CourseComponents.AssignedCoursesResults}
              />
            }
          />
          <Route
            path="assign/:levelId/upload"
            element={
              <LazyComponent
                component={ExaminationComponents.UploadSingleSubject}
              />
            }
          />
          <Route
            path="level"
            element={<LazyComponent component={CourseComponents.CourseLevel} />}
          />
          <Route
            path="level/:levelId"
            element={
              <LazyComponent
                component={ExaminationComponents.ExamsLevel}
                type="course/level"
              />
            }
          />
          <Route
            path="level/:levelId/reports"
            element={
              <LazyComponent
                component={ExaminationComponents.ViewExamsReports}
              />
            }
          />
          <Route
            path="level/:levelId/student"
            element={
              <LazyComponent component={ExaminationComponents.ExamsScore} />
            }
          />
          <Route
            path="level/:levelId/upload"
            element={
              <LazyComponent
                component={ExaminationComponents.LevelExamScoreInput}
              />
            }
          />
          <Route
            path="level/:id/attendance"
            element={
              <LazyComponent
                component={OtherComponents.NewAttendance}
                to="course/level"
              />
            }
          />
          <Route
            path="level/:id/history"
            element={
              <LazyComponent
                component={OtherComponents.AttendanceHistory}
                section="course/level"
              />
            }
          />
        </Route>

        {/* Event Routes for Teachers */}
        <Route
          path="/events"
          element={
            <LazyComponent
              component={EventComponents.MoreEvents}
              fallback={<EventSkeleton />}
            />
          }
        />
        <Route
          path="/events/:id"
          element={<LazyComponent component={EventComponents.ViewEvent} />}
        />
      </>
    );
  }, [user?.role]);

  const commonRoutes = useMemo(() => {
    if (!user?.role || !["administrator", "teacher"].includes(user.role))
      return null;

    return (
      <>
        {school_info.permissions?.includes(SCHOOL_PERMISSION.ANNOUNCEMENTS) && (
          <Route
            path="/announcements"
            element={
              <LazyComponent
                component={MoreAnnouncements}
                fallback={<EventSkeleton />}
              />
            }
          />
        )}

        <Route
          path="/profile"
          element={
            <LazyComponent
              component={OtherComponents.Profile}
              path="/profile"
            />
          }
        />

        {school_info.permissions?.includes(SCHOOL_PERMISSION.NOTES_BOARD) && (
          <Route
            path="/notes"
            element={<LazyComponent component={OtherComponents.NotesBoard} />}
          />
        )}
      </>
    );
  }, [user?.role]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyComponent
              component={OtherComponents.Dashboard}
              fallback={<DashboardSkeleton />}
            />
          }
        />

        {administratorRoutes}
        {teacherRoutes}
        {commonRoutes}

        <Route
          path="/about"
          element={<LazyComponent component={OtherComponents.About} />}
        />
      </Route>

      <Route
        path="/school-session"
        element={<LazyComponent component={OtherComponents.SchoolSession} />}
      />
      <Route path="/login" element={<Login />} />
      {/* Platform administration: own sign-in, outside the school session flow */}
      <Route
        path="/platform"
        element={<LazyComponent component={OtherComponents.Platform} />}
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default React.memo(Root);

// import React, { lazy, Suspense, useContext, useEffect } from "react";
// import { Route, Routes } from "react-router-dom";
// import { useAuth } from "@/hooks/useAuth";

// import Loader from "../../config/Loader";
// import Shell from "../Shell";
// import Login from "../Login";
// import PageNotFound from "../PageNotFound";
// import MoreAnnouncements from "../announcement/MoreAnnouncements";
// import DashboardSkeleton from "@/components/skeleton/DashboardSkeleton";
// import EventSkeleton from "@/components/skeleton/EventSkeleton";
// import ProtectedRoute from "./ProtectedRoute";
// import AddSession from "../session/AddSession";
// import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
// import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
// import Receipt from "../fees/Receipt";
// import StudentFeesReport from "../student/StudentFeesReport";

// //Session
// const Sessions = lazy(() => import("../session/Sessions"));
// const ViewSession = lazy(() => import("../session/ViewSession"));
// const EditSessionForm = lazy(() =>
//   import("../session/edit-form/EditSessionForm")
// );

// const LevelFeeInformation = lazy(() => import("../fees/LevelFeeInformation"));
// const Subject_Grade = lazy(() => import("../subject"));
// const NewAttendance = lazy(() => import("../level/NewAttendance"));

// const NotesBoard = lazy(() => import("../notes"));
// const Teacher = lazy(() => import("../teacher"));
// const TeacherView = lazy(() => import("../teacher/TeacherView"));
// const TeacherEdit = lazy(() => import("../teacher/TeacherEdit"));
// const Profile = lazy(() => import("../profile"));

// // Events
// import Event from "../events";
// import Section from "../sections";
// const UserPermissions = lazy(() => import("../user/UserPermissions"));

// const TutorAssignedCourses = lazy(() =>
//   import("../teacher/assigned/TutorAssignedCourses")
// );
// const TutorAssignedLevels = lazy(() =>
//   import("../teacher/assigned/TutorAssignedLevels")
// );

// const MoreEvents = lazy(() => import("../events/MoreEvents"));
// const EventHome = lazy(() => import("../events/EventHome"));
// const NewEvent = lazy(() => import("../events/NewEvent"));
// const ViewEvent = lazy(() => import("../events/ViewEvent"));
// const EditEvent = lazy(() => import("../events/EditEvent"));
// const TeacherAssignLevel = lazy(() => import("../teacher/TeacherAssignLevel"));
// const TeacherAssignCourse = lazy(() =>
//   import("../teacher/TeacherAssignCourse")
// );
// const AddCurrentSubjects = lazy(() =>
//   import("../../components/modals/AddCurrentSubjects")
// );
// const FeePaymentHistory = lazy(() => import("../fees/FeePaymentHistory"));
// const StudentFeesHistory = lazy(() => import("../fees/StudentFeesHistory"));
// const ExamsScore = lazy(() => import("../examination/ExamsScore"));
// const UserAdd = lazy(() => import("../user/UserAdd"));
// const User = lazy(() => import("../user"));
// const UserView = lazy(() => import("../user/UserView"));
// const UserEdit = lazy(() => import("../user/UserEdit"));
// const AttendanceHistory = lazy(() => import("../level/AttendanceHistory"));
// const Uploads = lazy(() => import("../uploads"));

// const FeeNew = lazy(() => import("../fees/FeeNew"));
// const LevelExamScoreInput = lazy(() =>
//   import("../examination/LevelExamScoreInput")
// );
// const UploadSingleSubject = lazy(() =>
//   import("../examination/UploadSingleSubject")
// );
// const ExamsHome = lazy(() => import("../examination/ExamsHome"));
// const ExamsLevel = lazy(() => import("../examination/ExamsLevel"));
// const ViewExamsReports = lazy(() => import("../examination/ViewExamsReports"));
// const SMS = lazy(() => import("../sms"));
// const SMSHome = lazy(() => import("../sms/SMSHome"));
// const SMSNew = lazy(() => import("../sms/SMSNew"));
// const Dashboard = lazy(() => import("../Dashboard"));
// const Session = lazy(() => import("../session"));
// const Fees = lazy(() => import("../fees"));
// const Examination = lazy(() => import("../examination"));
// const Student = lazy(() => import("../student"));
// const UserHome = lazy(() => import("../user/UserHome"));
// //
// const StudentHome = lazy(() => import("../student/StudentHome"));
// const StudentAdd = lazy(() => import("../student/StudentAdd"));
// const StudentEdit = lazy(() => import("../student/StudentEdit"));
// const StudentView = lazy(() => import("../student/StudentView"));

// const TeacherHome = lazy(() => import("../teacher/TeacherHome"));
// const About = lazy(() => import("../About"));
// const Settings = lazy(() => import("../settings/Settings"));
// const SchoolSession = lazy(() => import("../SchoolSession"));

// const FeeHome = lazy(() => import("../fees/FeeHome"));
// const FeeMakePayment = lazy(() => import("../fees/FeeMakePayment"));
// const Level = lazy(() => import("../level"));
// const LevelDashboard = lazy(() => import("../level/LevelDashboard"));
// const CurrentLevel = lazy(() => import("../level/CurrentLevel"));
// const StudentDetails = lazy(() => import("../student/StudentDetails"));
// const Course = lazy(() => import("../course"));
// const CourseHome = lazy(() => import("../course/CourseHome"));
// const CourseLevel = lazy(() => import("../course/CourseLevel"));
// const AssignedCourses = lazy(() => import("../course/AssignedCourses"));
// const AssignedCoursesResults = lazy(() =>
//   import("../course/AssignedCoursesResults")
// );

// const Root = () => {
//   const { user } = useAuth();
//   const { schoolSessionDispatch } = useContext(SchoolSessionContext);

//   useEffect(() => {
//     const handleOnline = () => {
//       schoolSessionDispatch(alertSuccess("Connection Restored"));
//     };

//     const handleOffline = () => {
//       schoolSessionDispatch(
//         alertError("Internet Connection Lost! Try reconnecting.")
//       );
//     };

//     window.addEventListener("online", handleOnline);
//     window.addEventListener("offline", handleOffline);

//     return () => {
//       window.removeEventListener("online", handleOnline);
//       window.removeEventListener("offline", handleOffline);
//     };
//   }, [schoolSessionDispatch]);

//   return (
//     <>
//       <Routes>
//         <Route
//           path="/"
//           element={
//             <ProtectedRoute>
//               <Shell />
//             </ProtectedRoute>
//           }
//         >
//           <Route
//             index
//             element={
//               <Suspense fallback={<DashboardSkeleton />}>
//                 <Dashboard />
//               </Suspense>
//             }
//           />

//           {user?.role === "administrator" && (
//             <>
//               {/* session */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Session />
//                   </Suspense>
//                 }
//                 path="/session"
//               >
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <Sessions />
//                     </Suspense>
//                   }
//                   index={true}
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <AddSession />
//                     </Suspense>
//                   }
//                   path="new"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <ViewSession />
//                     </Suspense>
//                   }
//                   path=":id"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <EditSessionForm />
//                     </Suspense>
//                   }
//                   path=":id/edit"
//                 />
//               </Route>

//               {/* Department & house management routes go here */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Section />
//                   </Suspense>
//                 }
//                 path="/departments-houses"
//               />
//               {/* Class and Subjects */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Level />
//                   </Suspense>
//                 }
//                 path="level"
//               >
//                 <Route
//                   index
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <LevelDashboard />
//                     </Suspense>
//                   }
//                 />

//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <CurrentLevel />
//                     </Suspense>
//                   }
//                   path=":id"
//                 />

//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <AddCurrentSubjects />
//                     </Suspense>
//                   }
//                   path=":id/courses"
//                 />
//                 <Route
//                   path=":id/attendance"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <NewAttendance to="/level/current" />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path=":id/history"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <AttendanceHistory section="level" />
//                     </Suspense>
//                   }
//                 />
//               </Route>
//               {/* subjects  */}
//               <Route
//                 path="subject"
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Subject_Grade />
//                   </Suspense>
//                 }
//               />
//               {/* Student */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Student />
//                   </Suspense>
//                 }
//                 path="/student"
//               >
//                 <Route
//                   index
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <StudentHome />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <StudentAdd />
//                     </Suspense>
//                   }
//                   path="new"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <StudentEdit />
//                     </Suspense>
//                   }
//                   path="edit"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <StudentView />
//                     </Suspense>
//                   }
//                   path="view"
//                 />
//                 <Route
//                   path="view/:studentId"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <StudentDetails />
//                     </Suspense>
//                   }
//                 />

//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <StudentFeesReport />
//                     </Suspense>
//                   }
//                   path="view/:studentId/fees"
//                 />
//               </Route>
//               {/* Teacher */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Teacher />
//                   </Suspense>
//                 }
//                 path="/teacher"
//               >
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <TeacherHome />
//                     </Suspense>
//                   }
//                   index
//                 />

//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <TeacherView />
//                     </Suspense>
//                   }
//                   path=":id"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <TeacherEdit />
//                     </Suspense>
//                   }
//                   path=":id/edit"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <TeacherAssignLevel />
//                     </Suspense>
//                   }
//                   path=":id/levels"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <TeacherAssignCourse />
//                     </Suspense>
//                   }
//                   path=":id/courses"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <TutorAssignedCourses />
//                     </Suspense>
//                   }
//                   path="courses"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <TutorAssignedLevels />
//                     </Suspense>
//                   }
//                   path="levels"
//                 />
//               </Route>
//               {/* Examination */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Examination />
//                   </Suspense>
//                 }
//                 path="/examination"
//               >
//                 <Route
//                   index
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <ExamsHome />
//                     </Suspense>
//                   }
//                 />

//                 <Route
//                   path=":levelId"
//                   element={<ExamsLevel type="examination" />}
//                 />

//                 <Route
//                   path=":levelId/student"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <ExamsScore />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path=":levelId/reports"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <ViewExamsReports />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path=":levelId/upload"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <LevelExamScoreInput />
//                     </Suspense>
//                   }
//                 />
//               </Route>
//               {/* Fees */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Fees />
//                   </Suspense>
//                 }
//                 path="/fee"
//               >
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <FeeHome />
//                     </Suspense>
//                   }
//                   index
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <FeeNew />
//                     </Suspense>
//                   }
//                   path="new"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <FeeMakePayment />
//                     </Suspense>
//                   }
//                   path="payment"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <FeePaymentHistory />
//                     </Suspense>
//                   }
//                   path="history"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <StudentFeesHistory />
//                     </Suspense>
//                   }
//                   path="payment/:student"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <LevelFeeInformation />
//                     </Suspense>
//                   }
//                   path="level"
//                 />
//                 <Route element={<Receipt />} path="receipt" />
//               </Route>
//               {/* messages */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <SMS />
//                   </Suspense>
//                 }
//                 path="/messages"
//               >
//                 <Route
//                   index
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <SMSHome />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="new"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <SMSNew />
//                     </Suspense>
//                   }
//                 />
//               </Route>
//               {/* uploads */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Uploads />
//                   </Suspense>
//                 }
//                 path="/uploads"
//               />
//               {/* settings */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Settings />
//                   </Suspense>
//                 }
//                 path="/settings"
//               />
//               {/* users */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <User />
//                   </Suspense>
//                 }
//                 path="/users"
//               >
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <UserHome />
//                     </Suspense>
//                   }
//                   index
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <UserAdd />
//                     </Suspense>
//                   }
//                   path="new"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <UserView />
//                     </Suspense>
//                   }
//                   path=":id"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <UserEdit />
//                     </Suspense>
//                   }
//                   path=":id/edit"
//                 />
//                 <Route
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <UserPermissions />
//                     </Suspense>
//                   }
//                   path=":id/permissions"
//                 />
//               </Route>
//             </>
//           )}

//           {user?.role === "teacher" && (
//             <>
//               {/* Course */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Course />
//                   </Suspense>
//                 }
//                 path="/course"
//               >
//                 <Route
//                   index
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <CourseHome />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="assign"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <AssignedCourses />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="assign/:levelId"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <AssignedCoursesResults />
//                     </Suspense>
//                   }
//                 />

//                 <Route
//                   path="assign/:levelId/upload"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <UploadSingleSubject />
//                     </Suspense>
//                   }
//                 />

//                 <Route
//                   path="level"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <CourseLevel />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="level/:levelId"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <ExamsLevel type="course/level" />
//                     </Suspense>
//                   }
//                 />

//                 <Route
//                   path="level/:levelId/reports"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <ViewExamsReports />
//                     </Suspense>
//                   }
//                 />

//                 <Route
//                   path="level/:levelId/student"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <ExamsScore />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="level/:levelId/upload"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <LevelExamScoreInput />
//                     </Suspense>
//                   }
//                 />

//                 <Route
//                   path="level/:id/attendance"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <NewAttendance to="course/level" />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="level/:id/history"
//                   element={
//                     <Suspense fallback={<Loader />}>
//                       <AttendanceHistory section="course/level" />
//                     </Suspense>
//                   }
//                 />
//               </Route>
//             </>
//           )}

//           {["administrator", "teacher"].includes(user?.role) && (
//             <>
//               {/* Announcements */}
//               <Route
//                 path="/announcements"
//                 element={
//                   <Suspense fallback={<EventSkeleton />}>
//                     <MoreAnnouncements />
//                   </Suspense>
//                 }
//               />

//               {/* profile */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <Profile />
//                   </Suspense>
//                 }
//                 path="/profile"
//               />

//               {/* Events */}

//               {user?.role === "teacher" && (
//                 <>
//                   <Route
//                     element={
//                       <Suspense fallback={<EventSkeleton />}>
//                         <MoreEvents />
//                       </Suspense>
//                     }
//                     path="/events"
//                   />

//                   <Route
//                     element={
//                       <Suspense fallback={<Loader />}>
//                         <ViewEvent />
//                       </Suspense>
//                     }
//                     path="/events/:id"
//                   />
//                 </>
//               )}

//               {user?.role === "administrator" && (
//                 <Route element={<Event />} path="/events">
//                   <Route
//                     element={
//                       <Suspense fallback={<Loader />}>
//                         <EventHome />
//                       </Suspense>
//                     }
//                     index
//                   />

//                   <Route
//                     element={
//                       <Suspense fallback={<Loader />}>
//                         <NewEvent />
//                       </Suspense>
//                     }
//                     path="new"
//                   />

//                   <Route
//                     element={
//                       <Suspense fallback={<Loader />}>
//                         <ViewEvent />
//                       </Suspense>
//                     }
//                     path=":id"
//                   />

//                   <Route
//                     element={
//                       <Suspense fallback={<Loader />}>
//                         <EditEvent />
//                       </Suspense>
//                     }
//                     path=":id/edit"
//                   />
//                 </Route>
//               )}

//               {/* notes */}
//               <Route
//                 element={
//                   <Suspense fallback={<Loader />}>
//                     <NotesBoard />
//                   </Suspense>
//                 }
//                 path="/notes"
//               />
//             </>
//           )}

//           <Route
//             element={
//               <Suspense fallback={<Loader />}>
//                 <About />
//               </Suspense>
//             }
//             path="/about"
//           />
//         </Route>
//         {/* school sessions */}
//         <Route
//           element={
//             <Suspense fallback={<Loader />}>
//               <SchoolSession />
//             </Suspense>
//           }
//           path="/school-session"
//         />

//         <Route element={<Login />} path="/login" />
//         <Route element={<PageNotFound />} path="*" />
//       </Routes>
//     </>
//   );
// };

// // const router = createBrowserRouter([
// //   {
// //     path: "/",
// //     element: <Shell />,
// //     children: [],
// //   },
// // ]);
// // return <RouterProvider router={router} />;

// export default Root;
