import { deleteNote, getAllNotes, postNote, putNote, putNoteOrder } from "@/api/noteAPI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAlert } from "@/context/AlertProvider";
import { errorMessage } from "@/lib/errorMessage";

export const useNotes = () => {
  return useQuery({
    queryKey: ["notes"],
    queryFn: getAllNotes,
  });
};

export const useCreateNote = () => {
  const { openAlert } = useAlert();
  const queryClient = useQueryClient();

  return useMutation({
    // returned, so a refused note is an error (it used to report "Note Created" at once)
    mutationFn: (data) => postNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      openAlert("success", "Note Created");
    },
    onError: (error) => {
      openAlert("error", errorMessage(error));
    },
  });
};

export const useUpdateNote = () => {
  const { openAlert } = useAlert();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }) => putNote(id, data),
    onSuccess: (updatedNote) => {
      queryClient.setQueryData(["notes"], (oldNotes) =>
        (oldNotes ?? []).map((note) =>
          note._id === updatedNote._id ? updatedNote : note
        )
      );
      openAlert("success", "Note Updated");
    },
    onError: (error) => {
      openAlert("error", errorMessage(error));
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  const { openAlert } = useAlert();

  return useMutation({
    mutationFn: (id) => deleteNote(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["notes"], (oldNotes) =>
        (oldNotes ?? []).filter((note) => note._id !== deletedId)
      );
      openAlert("success", "Note Removed");
    },
    onError: (error) => {
      openAlert("error", errorMessage(error));
    },
  });
};

// The board shows the new order at once; if saving it fails the old order comes back.
export const useReorderNotes = () => {
  const { openAlert } = useAlert();
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
      openAlert("error", errorMessage(error));
    },
  });
};
