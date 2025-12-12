import Home from './pages/Home';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import MyEventsList from './pages/MyEventsList';
import JoinEvent from './pages/JoinEvent';
import EditEvent from './pages/EditEvent';
import ChatOverview from './pages/ChatOverview';
import EventChat from './pages/EventChat';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminUsers from './pages/AdminUsers';
import CreateEventManual from './pages/CreateEventManual';
import WelcomePage from './pages/WelcomePage';
import VerifiedVenueFinder from './pages/VerifiedVenueFinder';
import InstaBackTest from './pages/InstaBackTest';
import HomePage from './pages/HomePage';
import AdminTemplatesSeed from './pages/AdminTemplatesSeed';
import AdminTemplatesManage from './pages/AdminTemplatesManage';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import MigrateImages from './pages/MigrateImages';
import NotificationCenter from './pages/NotificationCenter';
import AppSpecification from './pages/AppSpecification';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AccessibilityStatement from './pages/AccessibilityStatement';
import CreateEventAI from './pages/CreateEventAI';
import AdminSystemMessages from './pages/AdminSystemMessages';
import LandingPage from './pages/LandingPage';
import EventRSVP from './pages/EventRSVP';
import AdminVersions from './pages/AdminVersions';
import WhatsNew from './pages/WhatsNew';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "CreateEvent": CreateEvent,
    "EventDetail": EventDetail,
    "Tasks": Tasks,
    "Profile": Profile,
    "MyEventsList": MyEventsList,
    "JoinEvent": JoinEvent,
    "EditEvent": EditEvent,
    "ChatOverview": ChatOverview,
    "EventChat": EventChat,
    "AdminAnnouncements": AdminAnnouncements,
    "AdminUsers": AdminUsers,
    "CreateEventManual": CreateEventManual,
    "WelcomePage": WelcomePage,
    "VerifiedVenueFinder": VerifiedVenueFinder,
    "InstaBackTest": InstaBackTest,
    "HomePage": HomePage,
    "AdminTemplatesSeed": AdminTemplatesSeed,
    "AdminTemplatesManage": AdminTemplatesManage,
    "Auth": Auth,
    "AdminDashboard": AdminDashboard,
    "Privacy": Privacy,
    "Terms": Terms,
    "MigrateImages": MigrateImages,
    "NotificationCenter": NotificationCenter,
    "AppSpecification": AppSpecification,
    "ForgotPassword": ForgotPassword,
    "ResetPassword": ResetPassword,
    "AccessibilityStatement": AccessibilityStatement,
    "CreateEventAI": CreateEventAI,
    "AdminSystemMessages": AdminSystemMessages,
    "LandingPage": LandingPage,
    "EventRSVP": EventRSVP,
    "AdminVersions": AdminVersions,
    "WhatsNew": WhatsNew,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};