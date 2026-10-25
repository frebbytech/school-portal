/* eslint-disable react/prop-types */
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import _ from "lodash";
import { SCHOOL_PERMISSION } from "@/mockup/columns/sessionColumns";
import {
  getPlatformSchools,
  platformLogin,
  postPlatformSchool,
  postSchoolAdministrator,
  putPlatformSchool,
} from "@/api/platformAPI";

/**
 * Platform administration: the only place schools are created, their purchased
 * modules are chosen, and a school's first administrator is made. It sits outside
 * the school login/session flow on purpose. The token lives in component state only.
 */

const MODULES = Object.values(SCHOOL_PERMISSION);
const SCHOOL_FIELDS = [
  ["name", "School name"],
  ["code", "School code"],
  ["motto", "Motto"],
  ["address", "Address"],
  ["location", "Location"],
  ["district", "District"],
  ["region", "Region"],
  ["email", "Email"],
  ["website", "Website"],
  ["phonenumber", "Phone number"],
];
const ADMIN_FIELDS = [
  ["firstname", "First name"],
  ["lastname", "Last name"],
  ["username", "Username"],
  ["email", "Email"],
  ["phonenumber", "Phone number"],
];

const Field = ({ label, value, onChange, ...rest }) => (
  <TextField
    size="small"
    fullWidth
    label={label}
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value)}
    {...rest}
  />
);

const Login = ({ onSignedIn }) => {
  const [values, setValues] = useState({ username: "", password: "" });
  const { mutate, isPending, error } = useMutation({
    mutationFn: platformLogin,
    onSuccess: (data) => onSignedIn(data.token),
  });

  return (
    <Container maxWidth="xs" sx={{ pt: 12 }}>
      <Paper sx={{ p: 4 }}>
        <Stack
          component="form"
          rowGap={2}
          onSubmit={(e) => {
            e.preventDefault();
            mutate(values);
          }}
        >
          <Typography variant="h5">Platform administration</Typography>
          {error && <Alert severity="error">{error.message}</Alert>}
          <Field
            label="Username"
            value={values.username}
            autoComplete="username"
            onChange={(username) => setValues((v) => ({ ...v, username }))}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(password) => setValues((v) => ({ ...v, password }))}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isPending || !values.username || !values.password}
          >
            {isPending ? <CircularProgress size={22} /> : "Sign in"}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

// Create a school, or edit one (including its modules)
const SchoolDialog = ({ token, school, onClose, onSaved }) => {
  const editing = Boolean(school?._id);
  const [values, setValues] = useState(
    school ?? { permissions: ["School Sessions", "Levels", "Subjects", "Grades", "Students", "Teachers", "Examination Portal"] }
  );
  const { mutate, isPending, error } = useMutation({
    mutationFn: (data) =>
      editing ? putPlatformSchool(token, data) : postPlatformSchool(token, data),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const toggle = (module) =>
    setValues((v) => {
      const has = v.permissions?.includes(module);
      return {
        ...v,
        permissions: has
          ? v.permissions.filter((m) => m !== module)
          : [...(v.permissions ?? []), module],
      };
    });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? "Edit school" : "New school"}</DialogTitle>
      <DialogContent>
        <Stack rowGap={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error.message}</Alert>}
          {SCHOOL_FIELDS.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={values[key]}
              disabled={editing && key === "code"}
              onChange={(value) => setValues((v) => ({ ...v, [key]: value }))}
            />
          ))}
          <Typography variant="subtitle2">Purchased modules</Typography>
          <FormGroup row>
            {MODULES.map((module) => (
              <FormControlLabel
                key={module}
                sx={{ width: "50%", m: 0 }}
                label={module}
                control={
                  <Checkbox
                    size="small"
                    checked={Boolean(values.permissions?.includes(module))}
                    onChange={() => toggle(module)}
                  />
                }
              />
            ))}
          </FormGroup>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={isPending || !values.name || (!editing && !values.code)}
          onClick={() => {
            // `code` is fixed once a school exists; the server ignores unknown fields
            mutate(_.omit(values, ["createdAt", "updatedAt", "__v", ...(editing ? ["code"] : [])]));
          }}
        >
          {isPending ? <CircularProgress size={22} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Create the school's first (or another) administrator
const AdministratorDialog = ({ token, school, onClose }) => {
  const [values, setValues] = useState({});
  const [created, setCreated] = useState(null);
  const { mutate, isPending, error } = useMutation({
    mutationFn: (data) => postSchoolAdministrator(token, { schoolId: school._id, ...data }),
    onSuccess: (data) => setCreated(data),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Administrator for {school.name}</DialogTitle>
      <DialogContent>
        <Stack rowGap={2} sx={{ pt: 1 }}>
          {created ? (
            <Alert severity="success">
              Administrator &quot;{created.username}&quot; created. They sign in with the
              school code <b>{school.code}</b>.
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error">{error.message}</Alert>}
              {ADMIN_FIELDS.map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={values[key]}
                  onChange={(value) => setValues((v) => ({ ...v, [key]: value }))}
                />
              ))}
              <Field
                label="Password (at least 8 characters)"
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={(password) => setValues((v) => ({ ...v, password }))}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{created ? "Close" : "Cancel"}</Button>
        {!created && (
          <Button
            variant="contained"
            disabled={isPending || !values.username || (values.password ?? "").length < 8}
            onClick={() => mutate(values)}
          >
            {isPending ? <CircularProgress size={22} /> : "Create administrator"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const Schools = ({ token, onSignedOut }) => {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null); // { type: "school" | "admin", school? }

  const { data: schools = [], isPending, error } = useQuery({
    queryKey: ["platform", "schools"],
    queryFn: () => getPlatformSchools(token),
    retry: false,
  });

  // An expired or refused token sends the person back to the sign-in form
  if (error && [401, 403].includes(error.status)) {
    onSignedOut();
    return null;
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform", "schools"] });

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Schools</Typography>
        <Stack direction="row" columnGap={1}>
          <Button variant="contained" onClick={() => setDialog({ type: "school" })}>
            New school
          </Button>
          <Button onClick={onSignedOut}>Sign out</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      {isPending && <CircularProgress />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Modules</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school._id}>
                <TableCell>{school.name}</TableCell>
                <TableCell>{school.code}</TableCell>
                <TableCell>{school.region}</TableCell>
                <TableCell>
                  <Chip size="small" label={`${school.permissions?.length ?? 0} modules`} />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => setDialog({ type: "school", school })}>
                    Edit
                  </Button>
                  <Button size="small" onClick={() => setDialog({ type: "admin", school })}>
                    Add administrator
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isPending && schools.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ py: 3, textAlign: "center" }}>No schools yet.</Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {dialog?.type === "school" && (
        <SchoolDialog
          token={token}
          school={dialog.school}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      )}
      {dialog?.type === "admin" && (
        <AdministratorDialog token={token} school={dialog.school} onClose={() => setDialog(null)} />
      )}
    </Container>
  );
};

const Platform = () => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(null);

  const signOut = () => {
    setToken(null);
    queryClient.removeQueries({ queryKey: ["platform"] });
  };

  return token ? <Schools token={token} onSignedOut={signOut} /> : <Login onSignedIn={setToken} />;
};

export default Platform;
