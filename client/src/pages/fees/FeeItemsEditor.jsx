import React, { useState } from "react";
import { Autocomplete, Box, Button, Divider, InputAdornment, List, Stack, TextField, Typography } from "@mui/material";
import { FEES_OPTIONS } from "@/mockup/columns/sessionColumns";
import { currencyFormatter } from "@/config/currencyFormatter";
import FeesItem from "./FeeItem";
import { addItem, removeItem, totalOf } from "./feeItems";

// The "fee type + amount, Add" part shared by the New Fees and Edit Fees dialogs.
// `items` is the list, `onChange(list)` receives the new one; `error` is a form-level message.
const FeeItemsEditor = ({ items, onChange, error }) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [problem, setProblem] = useState("");

  const add = () => {
    const result = addItem(items, name, amount);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    setProblem("");
    onChange(result.list);
    setName("");
    setAmount("");
  };

  return (
    <Stack spacing={2}>
      {/* A small form, so Enter in the amount box adds the item. */}
      <Stack
        component="form"
        spacing={2}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          add();
        }}
      >
        <Autocomplete
          freeSolo
          fullWidth
          options={FEES_OPTIONS}
          inputValue={name}
          onInputChange={(e, value) => setName(value)}
          renderInput={(params) => <TextField {...params} label="Fee Type" size="small" />}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
          <TextField
            label="Fee Amount"
            size="small"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={Boolean(problem)}
            helperText={problem || " "}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">GHS</InputAdornment> } }}
          />
          <Button type="submit" variant="contained" size="small" sx={{ mt: 0.5 }}>
            Add
          </Button>
        </Box>
      </Stack>

      <List
        sx={{ maxHeight: 400, overflowY: "auto" }}
        subheader={
          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
            Fees
          </Typography>
        }
      >
        {items.length === 0 ? (
          <Typography>No Fee Available</Typography>
        ) : (
          items.map((item) => <FeesItem key={item.fee} data={item} removeFee={(n) => onChange(removeItem(items, n))} />)
        )}
        <Divider />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Total Fees
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {currencyFormatter(totalOf(items))}
          </Typography>
        </Stack>
      </List>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
};

export default FeeItemsEditor;
