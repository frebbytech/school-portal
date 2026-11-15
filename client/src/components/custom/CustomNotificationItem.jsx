import { DeleteRounded, Label } from "@mui/icons-material";
import LocalLibraryRoundedIcon from "@mui/icons-material/LocalLibraryRounded";
import LocalLibraryOutlinedIcon from "@mui/icons-material/LocalLibraryOutlined";
import { Divider, IconButton, Stack, Typography, Tooltip } from "@mui/material";
import React from "react";
import { motion } from "framer-motion";
import dayjs from "@/lib/dates";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

import { useDeleteNotification, useMarkAsRead } from "@/hooks/useNotifications";

function CustomNotificationItem({
  _id,
  type,
  title,
  album,
  active,
  description,
  link,
  createdAt,
  closeDrawer,
  index,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();

  const handleMarkAsRead = () => {
    markAsRead.mutate(_id);
  };

  const handleRemove = () => {
    deleteNotification.mutate(_id);
  };

  const handleItemClick = () => {
    closeDrawer(false);
    if (type === "Event") {
      navigate(`${link}?redirect_to=${pathname}`, {
        state: {
          prevPath: pathname,
        },
      });
    }
    handleMarkAsRead();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ duration: 0.3, delay: index * 0.15 }}
      className="notification-item"
      style={{
        padding: "0 16px 0 16px",
        borderRadius: "12px",
        cursor: "pointer",
        backgroundColor: active ? "rgba(15, 199, 168, 0.1)" : "#fff",
      }}
    >
      <div onClick={handleItemClick}>
        <Stack direction="row" justifyContent="space-between" py={1}>
          <Typography variant="body2" color="primary" fontWeight="bold">
            {title}
          </Typography>
          {active && <Label htmlColor="green" />}
        </Stack>
        {album && (
          <img
            src={album}
            style={{ width: "100%", height: "120px", objectFit: "cover" }}
            onClick={handleItemClick}
          />
        )}

        <Typography variant="body2">{description}</Typography>
        {["Event", "Announcement"].includes(type) && (
          <Link
            to={link}
            style={{
              display: "block",
              width: "100%",
              textAlign: "right",
              fontSize: "12px",
            }}
          >
            Read More
          </Link>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          paddingTop: "4px",
        }}
      >
        <Typography
          variant="caption"
          fontStyle="italic"
          color="primary"
          fontWeight="bold"
        >
          {dayjs(new Date(createdAt)).format("LLL")}
        </Typography>
        <Stack direction="row">
          {active ? (
            <Tooltip title="Mark as unread">
              <IconButton onClick={handleMarkAsRead}>
                <LocalLibraryRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Mark as read">
              <IconButton>
                <LocalLibraryOutlinedIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Remove">
            <IconButton onClick={handleRemove}>
              <DeleteRounded />
            </IconButton>
          </Tooltip>
        </Stack>
      </div>
      <Divider />
    </motion.div>
  );
}
CustomNotificationItem.propTypes = {
  _id: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  album: PropTypes.string,
  active: PropTypes.bool.isRequired,
  description: PropTypes.string,
  link: PropTypes.string,
  createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
    .isRequired,
  closeDrawer: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};

export default CustomNotificationItem;
