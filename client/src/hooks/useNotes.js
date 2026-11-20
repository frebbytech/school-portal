import { use } from "react";
import { deleteNote, getAllNotes, postNote, putNote, putNoteOrder } from "@/api/noteAPI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";

export const useNotes = () => {
  return useQuery({
    queryKey: ["notes"],
    queryFn: getAllNotes,
  });
};

export const useCreateNote = () => {
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      schoolSessionDispatch(alertSuccess("Note Created"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });
};

export const useUpdateNote = () => {
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }) => putNote(id, data),
    onSuccess: (updatedNote) => {
      queryClient.setQueryData(["notes"], (oldNotes) =>
        (oldNotes ?? []).map((note) =>
          note._id === updatedNote._id ? updatedNote : note
        )
      );
      schoolSessionDispatch(alertSuccess("Note Updated"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = use(SchoolSessionContext);

  return useMutation({
    mutationFn: (id) => deleteNote(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["notes"], (oldNotes) =>
        (oldNotes ?? []).filter((note) => note._id !== deletedId)
      );
      schoolSessionDispatch(alertSuccess("Note Removed"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });
};

// The board shows the new order at once; if saving it fails the old order comes back.
export const useReorderNotes = () => {
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notes }) => putNoteOrder(notes.map((note) => note._id)),
    onMutate: async ({ notes }) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueryData(["notes"]);
      queryClient.setQueryData(["notes"], notes);
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["notes"], context.previous);
      schoolSessionDispatch(alertError(error));
    },
  });
};
