import React, { useState } from "react";
import {
  AppBar,
  Badge,
  Box,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  DescriptionRounded,
  Menu,
  NotificationsSharp,
  SearchRounded,
} from "@mui/icons-material";
import MiniSidebar from "./MiniSidebar";
import NotificationDrawer from "@/components/dropdowns/NotificationDrawer";
import AccountDropdown from "@/components/dropdowns/AccountDropdown";
import { bgBlur } from "@/theme/css";
import NoteFormModal from "@/components/notes/NoteForm";
import { useCreateNote } from "@/hooks/useNotes";
import { useNotifications } from "@/hooks/useNotifications";


function Header() {
  const { palette } = useTheme();
  const { data } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);
  const [openMiniBar, setOpenMiniBar] = useState(false);
  const [openNotificationDrawer, setOpenNotificationDrawer] = useState(false);

  const createNote = useCreateNote();

  const handleOpenBar = () => setOpenMiniBar(true);
  const handleOpenNotificationDrawer = () => setOpenNotificationDrawer(true);

  const handleSubmit = (data) => {
    createNote.mutate(data);
  };

  const activeNotifications = data?.filter((notif) => notif?.active);

  return (
    <>
      <MiniSidebar open={openMiniBar} setOpen={setOpenMiniBar} />
      <NotificationDrawer
        open={openNotificationDrawer}
        setOpen={setOpenNotificationDrawer}
      />
      <AppBar
        position="sticky"
        sx={{
          width: "100%",
          zIndex: 999,
          p: 1,
          // borderBottom: "2px solid var(--secondary)",
          ...bgBlur({
            color: palette.background.default,
          }),
          boxShadow: "0 0 20px rgba(0, 0, 0, 0.08)",
          // backgroundColor: "var(--primary)",
          // backdropFilter: "blur(10px)",
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
              // justifySelf: "flex-start",
              // flexGrow: 1,
              // px: 1,
            }}
          ></Box>
          <Tooltip title="Search">
            <IconButton>
              <SearchRounded />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add Note">
            <IconButton onClick={() => setModalOpen(true)}>
              <DescriptionRounded />
            </IconButton>
          </Tooltip>

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
