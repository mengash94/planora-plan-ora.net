import AccessibilityStatement from './pages/AccessibilityStatement';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminDashboard from './pages/AdminDashboard';
import AdminSystemMessages from './pages/AdminSystemMessages';
import AdminTemplatesManage from './pages/AdminTemplatesManage';
import AdminTemplatesSeed from './pages/AdminTemplatesSeed';
import AdminUsers from './pages/AdminUsers';
import AdminVersions from './pages/AdminVersions';
import App from './pages/App';
import AppSpecification from './pages/AppSpecification';
import Auth from './pages/Auth';
import ChatOverview from './pages/ChatOverview';
import CreateEvent from './pages/CreateEvent';
import CreateEventAI from './pages/CreateEventAI';
import CreateEventManual from './pages/CreateEventManual';
import EditEvent from './pages/EditEvent';
import EventChat from './pages/EventChat';
import EventDetail from './pages/EventDetail';
import EventRSVP from './pages/EventRSVP';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import HomePage from './pages/HomePage';
import InstaBackTest from './pages/InstaBackTest';
import JoinEvent from './pages/JoinEvent';
import LandingPage from './pages/LandingPage';
import MigrateImages from './pages/MigrateImages';
import MyEventsList from './pages/MyEventsList';
import NotificationCenter from './pages/NotificationCenter';
import OnePager from './pages/OnePager';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import Tasks from './pages/Tasks';
import Terms from './pages/Terms';
import VerifiedVenueFinder from './pages/VerifiedVenueFinder';
import WelcomeTest from './pages/WelcomeTest';
import WhatsNew from './pages/WhatsNew';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessibilityStatement": AccessibilityStatement,
    "AdminAnalytics": AdminAnalytics,
    "AdminAnnouncements": AdminAnnouncements,
    "AdminDashboard": AdminDashboard,
    "AdminSystemMessages": AdminSystemMessages,
    "AdminTemplatesManage": AdminTemplatesManage,
    "AdminTemplatesSeed": AdminTemplatesSeed,
    "AdminUsers": AdminUsers,
    "AdminVersions": AdminVersions,
    "App": App,
    "AppSpecification": AppSpecification,
    "Auth": Auth,
    "ChatOverview": ChatOverview,
    "CreateEvent": CreateEvent,
    "CreateEventAI": CreateEventAI,
    "CreateEventManual": CreateEventManual,
    "EditEvent": EditEvent,
    "EventChat": EventChat,
    "EventDetail": EventDetail,
    "EventRSVP": EventRSVP,
    "ForgotPassword": ForgotPassword,
    "Home": Home,
    "HomePage": HomePage,
    "InstaBackTest": InstaBackTest,
    "JoinEvent": JoinEvent,
    "LandingPage": LandingPage,
    "MigrateImages": MigrateImages,
    "MyEventsList": MyEventsList,
    "NotificationCenter": NotificationCenter,
    "OnePager": OnePager,
    "Privacy": Privacy,
    "Profile": Profile,
    "ResetPassword": ResetPassword,
    "Tasks": Tasks,
    "Terms": Terms,
    "VerifiedVenueFinder": VerifiedVenueFinder,
    "WelcomeTest": WelcomeTest,
    "WhatsNew": WhatsNew,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};