import { supabase } from "../../supabase/supabase";

const BUCKET = "match-photos";

export async function uploadMatchPhotos(matchId: string, files: FileList) {
  for (const file of Array.from(files)) {
    const ext = file.name.split(".").pop();
    const path = `${matchId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file);

    if (uploadError) {
      console.error("STORAGE UPLOAD ERROR:", uploadError);
      throw uploadError;
    }

    const { error: insertError } = await supabase.from("match_photos").insert({
      match_id: matchId,
      photo_url: path,
    });

    if (insertError) {
      console.error("MATCH_PHOTOS INSERT ERROR:", insertError);
      throw insertError;
    }
  }
}

export async function deleteMatchPhoto(photoId: string, photoUrl: string) {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([photoUrl]);

  if (storageError) {
    console.error("STORAGE DELETE ERROR:", storageError);
    throw storageError;
  }

  const { error: deleteError } = await supabase
    .from("match_photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    console.error("MATCH_PHOTOS DELETE ERROR:", deleteError);
    throw deleteError;
  }
}