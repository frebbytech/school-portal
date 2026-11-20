import React from "react";
import {
  Button,
  Box,
  FormControl,
  InputLabel,
  Modal,
  Typography,
  IconButton,
} from "@mui/material";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Input from "@/components/inputs/Input";
import { useEffect } from "react";

const schema = yup.object({
  title: yup.string().required("Title is required").max(50),
  content: yup.string().required("Content is required").max(500),
  color: yup.string().required("Color is required"),
});

const colors = [
  "#ffc09f",
  "#fff9c4",
  "#edf6f9",
  "#ffcdd2",
  "#c5cae9",
  "#5e747f",
  "#7B9E87",
  "#E29578",
  "#FFDDD2",
  "#83C5BE",
];


const NoteFormModal = ({ open, onClose, defaultValues, onSubmit }) => {
  const { control, handleSubmit, reset, watch, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultValues || { color: "#ffc09f" },
  });

  const handleChange = (_event, newColor) => {
    if (newColor !== null) {
      setValue("color", newColor);
    }
  };

  const colorWatch = watch("color", colors[0]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues?._id]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="note-form-modal"
      aria-describedby="note-form-modal-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 500, md: 768 },
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 2,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h6">
            {defaultValues ? "Edit Note" : "New Note"}
          </Typography>
          <IconButton onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>

        <form
          // The form closes only once the save has worked (`done`), so a refused note
          // keeps what was typed.
          onSubmit={handleSubmit((data) => onSubmit(data, handleClose))}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Input
              label="Title"
              name="title"
              fullWidth
              autoFocus
              control={control}
              size="small"
            />

            <Input
              label="Content"
              name="content"
              control={control}
              multiline
              rows={4}
              fullWidth
              size="small"
            />

            <FormControl fullWidth>
              <InputLabel>Select Color</InputLabel>

              <ToggleButtonGroup
                value={colorWatch}
                exclusive
                onChange={handleChange}
                aria-label="color palette"
                sx={{
                  mt: 6,
                }}
              >
                {colors.map((color) => (
                  <ToggleButton
                    key={color}
                    value={color}
                    sx={{
                      backgroundColor: color,
                      width: 40,
                      height: 30,
                      border: "1px solid #ccc",
                      display: "flex",
                      flexDirection: "column",
                      fontSize: 10,
                      borderColor:
                        colorWatch === color ? "var(--primary)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>
                      {colorWatch === color && "✔"}
                    </span>
                    {/* {colorWatch === color && <span> {colorWatch}</span>} */}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </FormControl>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 3,
              }}
            >
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                {defaultValues ? "Save Changes" : "Create"}
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default NoteFormModal;
