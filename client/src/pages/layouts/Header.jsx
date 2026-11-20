import React, { use, useState } from "react";
import {
  Alert,
  AppBar,
  Badge,
  Box,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  DescriptionRounded,
  Menu,
  NotificationsSharp,
  SearchRounded,
} from "@mui/icons-material";
import GlobalAlert from "@/components/alerts/GlobalAlert";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import QuickMessage from "@/components/modals/QuickMessage";
import MiniSidebar from "./MiniSidebar";
import NotificationDrawer from "@/components/dropdowns/NotificationDrawer";
import AccountDropdown from "@/components/dropdowns/AccountDropdown";
import AddSectionDropdown from "@/components/dropdowns/AddSectionDropdown";
import SchoolSessionDropdown from "@/components/dropdowns/SchoolSessionDropdown";
import { bgBlur } from "@/theme/css";
import NoteFormModal from "@/components/notes/NoteForm";
import { useCreateNote } from "@/hooks/useNotes";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import _ from "lodash";
import { SCHOOL_PERMISSION, USER_ROLE } from "@/mockup/columns/sessionColumns";

function Header() {
  const { palette } = useTheme();
  const { user, school_info } = useAuth();
  const { data } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);
  const [openMiniBar, setOpenMiniBar] = useState(false);
  const [openNotificationDrawer, setOpenNotificationDrawer] = useState(false);
  const {
    schoolSessionState: { generalAlert },
    schoolSessionDispatch,
  } = use(SchoolSessionContext);
  const createNote = useCreateNote();

  const handleOpenBar = () => setOpenMiniBar(true);
  const handleOpenNotificationDrawer = () => setOpenNotificationDrawer(true);

  const closeGeneralAlert = () => {
    schoolSessionDispatch({
      type: "openGeneralAlert",
      payload: {
        message: "",
        severity: "",
      },
    });
  };

  const handleSubmit = (data, done) => {
    createNote.mutate(data, { onSuccess: done });
  };

  // A slow or failed notification request must not replace the whole header: the bell
  // simply shows no number until the list has loaded (the drawer explains a failure).

  const activeNotifications =
    _.isArray(data) && data?.filter((notif) => notif?.active);

  return (
    <>
      <GlobalAlert />
      {generalAlert?.message && (
        <Alert
          severity={generalAlert?.severity}
          onClose={closeGeneralAlert}
          sx={{
            zIndex: 999999,
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {generalAlert?.message}
        </Alert>
      )}
      <QuickMessage />

      <MiniSidebar open={openMiniBar} setOpen={setOpenMiniBar} />

      <NotificationDrawer
        open={openNotificationDrawer}
        setOpen={setOpenNotificationDrawer}
      />
      <AppBar
        position="sticky"
        sx={{
          // bgcolor: "white",
          width: "100%",
          p: 1,
          py: 2,
          zIndex: 999,
          // borderBottom: "2px solid var(--secondary)",
          ...bgBlur({
            color: palette.background.default,
          }),
        }}
        elevation={0}
      >
        <Box
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifySelf: "flex-start",
              flexGrow: 1,
              px: 1,
            }}
          >
            {/* <HomeLinks /> */}
            <Box
              sx={{
                display: { xs: "inline-flex", md: "none" },
                justifySelf: "flex-start",
                flexGrow: 1,
                px: 1,
              }}
            >
              <IconButton onClick={handleOpenBar}>
                <Menu />
              </IconButton>
            </Box>
          </Box>
          <Box
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              // position: "absolute",
              // top: 30,
              // right: 0,
            }}
          >
            <SchoolSessionDropdown />
          </Box>
          <Tooltip title="Search">
            <IconButton>
              <SearchRounded />
            </IconButton>
          </Tooltip>

          {school_info.permissions?.includes(SCHOOL_PERMISSION.NOTES_BOARD) && (
            <Tooltip title="Add Note">
              <IconButton onClick={() => setModalOpen(true)}>
                <DescriptionRounded />
              </IconButton>
            </Tooltip>
          )}
          {user.role === USER_ROLE.ADMIN && <AddSectionDropdown />}

          <div style={{ position: "relative" }}>
            <Tooltip title="Notifications">
              <IconButton onClick={handleOpenNotificationDrawer}>
                <Badge badgeContent={activeNotifications?.length} color="error">
                  <NotificationsSharp />
                </Badge>
              </IconButton>
            </Tooltip>
          </div>

          <AccountDropdown />
        </Box>
      </AppBar>

      <NoteFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}

export default Header;
