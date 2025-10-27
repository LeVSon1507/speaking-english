"use client";
import { useRouter } from "next/navigation";

type LoginPromptProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function LoginPrompt({ open, onClose }: LoginPromptProps) {
  const router = useRouter();
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="rounded-xl bg-white border border-black/10 shadow-[8px_8px_0px_#00000025] w-[360px] p-4">
        <div className="text-sm font-semibold">Đăng nhập để tiếp tục</div>
        <div className="text-xs text-neutral-600 mt-1">
          Hãy đăng nhập để lưu lịch sử, bookmark và từ vựng.
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 h-9 rounded-full border border-black/10 bg-white text-xs hover:bg-neutral-50"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              router.push("/account/login");
            }}
            className="px-3 h-9 rounded-full bg-[#1093DB] text-white text-xs hover:opacity-90"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}