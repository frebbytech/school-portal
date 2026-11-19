import React, { useState, use, useEffect } from "react";
import {
  Box,
  Grid2 as Grid,
  Card,
  CardMedia,
  Button,
  Modal,
  Typography,
  IconButton,
  Container,
  Divider,
  FormControl,
  MenuItem,
  Paper,
  Stack,
  CardActionArea,
  CardContent,
  FormHelperText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserContext } from "@/context/providers/UserProvider";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { updateTermDetails } from "@/api/termAPI";
import Swal from "sweetalert2";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import SelectInput from "@/components/inputs/SelectInput";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { object, string } from "yup";

// Sample report card templates (replace with your actual HTML/CSS templates)
const reportTemplates = [
  { id: "template1", name: "Template 1", preview: "/reports/template1.png" },
  { id: "template2", name: "Template 2", preview: "/reports/template2.png" },
  // { id: "template3", name: "Template 3", preview: "/reports/template3.png" },
];

const schema = object().shape({
  template: string().required("Please select a report template"),

  dimension: string()
    .oneOf(["A4", "A3", "Letter"], "Invalid report dimension")
    .required("Report dimension is required"),
});

const ReportTemplates = () => {
  const queryClient = useQueryClient();
  const { updateSession, session } = use(UserContext);
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const {
    handleSubmit,
    watch,
    reset,
    control,
    setValue,

    formState: { isSubmitting, errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      template: "",
      dimension: "",
    },
  });

  useEffect(() => {
    reset({
      template: session?.report?.template,
      dimension: session?.report?.dimension,
    });
  }, [session, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: updateTermDetails,
  });

  const onSubmit = (values) => {
    Swal.fire({
      title: "Changing report",
      text: "Set as default report template?",
      showCancelButton: true,
      allowOutsideClick: false,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        const details = {
          termId: session?.termId,
          type: "report",
          report: values,
        };

        mutate(details, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["terms"] });
            queryClient.invalidateQueries({ queryKey: ["terms/:id"] });
          },
          onSuccess: (data) => {
            updateSession({
              report: details?.report,
            });
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  const selectedTemplate = watch("template");

  return (
    <Container sx={{ p: 4 }}>
      <Box sx={{ placeSelf: "start" }}>
        <Typography variant="h6" color="primary">
          Report Customization
        </Typography>
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          Customize your reports by selecting a preferred template and setting
          the report dimensions.
        </Typography>
        <Divider />
      </Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2} py={2}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
            {/* Report Template Selection */}
            <Box mb={4}>
              <Typography variant="h6" fontWeight="medium">
                Report Template
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Choose a template, preview it, and select your preferred layout.
              </Typography>

              <Grid container spacing={2} gap={2}>
                {reportTemplates.map((template) => (
                  <Grid
                    size={{
                      xs: 12,
                      md: 6,
                    }}
                    key={template.id}
                  >
                    <Card
                      sx={{
                        border:
                          selectedTemplate === template.id
                            ? "2px solid var(--primary)"
                            : "2px solid transparent",
                        boxShadow: selectedTemplate === template.id ? 4 : 1,
                      }}
                    >
                      <CardActionArea
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <CardMedia
                          component="img"
                          height="auto"
                          image={template.preview}
                          alt={template.name}
                        />
                        <CardContent>
                          <Typography variant="body1" align="center">
                            {template.name}{" "}
                            {selectedTemplate === template.id ? "✅" : ""}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {errors?.template && (
                <FormHelperText sx={{ color: "error.main" }}>
                  {errors?.template?.message}
                </FormHelperText>
              )}
            </Box>
          </Paper>

          {/* Report Dimension Selection */}
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="medium">
                Report Dimension
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Select the preferred paper size for your reports.
              </Typography>
              <FormControl fullWidth>
                <SelectInput
                  label="Dimension"
                  size="small"
                  name="dimension"
                  control={control}
                  fullWidth
                  margin="normal"
                  required
                >
                  <MenuItem value="Letter">Letter</MenuItem>
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="A3">A3</MenuItem>
                </SelectInput>
              </FormControl>
            </Box>
            {/* Submit Button */}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="submit"
                loading={isPending}
                variant="contained"
                onClick={handleSubmit}
                disabled={isPending || isSubmitting}
              >
                {isPending ? "Please Wait.." : "Update Changes"}
              </Button>
            </Box>

            {/* Modal for Template Preview */}
            <Modal
              open={!!previewTemplate}
              onClose={() => setPreviewTemplate(null)}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  bgcolor: "background.paper",
                  boxShadow: 24,
                  p: 2,
                  borderRadius: 2,
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <IconButton
                  sx={{ position: "absolute", top: 10, right: 10 }}
                  onClick={() => setPreviewTemplate(null)}
                >
                  <CloseIcon />
                </IconButton>
                {previewTemplate && (
                  <>
                    <Box>
                      <Typography
                        variant="button"
                        color={
                          selectedTemplate === previewTemplate.id
                            ? "primary"
                            : "secondary"
                        }
                        onClick={() => {
                          setPreviewTemplate(null);
                          setValue("template", previewTemplate.id);
                        }}
                        sx={{
                          cursor: "pointer",
                          fontWeight: "bold",
                          p: 1,
                          border: "1px solid",
                          borderRadius: 1,
                          "&:hover": {
                            bgcolor: "primary.light",
                          },
                        }}
                      >
                        {selectedTemplate === previewTemplate.id
                          ? "Selected ✅"
                          : "Select Template"}
                      </Typography>
                    </Box>

                    <Typography variant="h6" mb={2}>
                      {previewTemplate.name}
                    </Typography>
                    <CardMedia
                      component="img"
                      image={previewTemplate.preview}
                      alt={previewTemplate.name}
                      sx={{
                        // maxHeight: "80vh",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </>
                )}
              </Box>
            </Modal>
          </Paper>
        </Stack>
      </form>
    </Container>
  );
};

export default ReportTemplates;
