import { MdRefresh } from "react-icons/md";

export default function Revalidate() {
  const revalidate = () => {
    fetch("/api/revalidate").then((res) => {
      if (res.ok) {
        window.location.reload();
      }
    });
  };

  return (
    <div id="revalidate" className="rounded-full flex align-middle self-center mr-3">
      <button
        type="button"
        onClick={() => revalidate()}
        title="刷新配置 / Revalidate"
        aria-label="刷新配置 / Revalidate"
        className="flex h-9 w-9 items-center justify-center cursor-pointer text-theme-800 dark:text-theme-200 hover:text-theme-600 dark:hover:text-theme-100 transition-colors"
      >
        <MdRefresh className="w-6 h-6" />
      </button>
    </div>
  );
}
