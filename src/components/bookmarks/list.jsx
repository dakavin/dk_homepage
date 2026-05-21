import classNames from "classnames";
import Item from "components/bookmarks/item";

import { columnMap } from "../../utils/layout/columns";

export default function List({ bookmarks, layout, bookmarksStyle }) {
  let classes =
    layout?.style === "row"
      ? `grid ${columnMap[layout?.columns]} gap-2`
      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bookmark-list";
  const style = {};
  if (layout?.iconsOnly || bookmarksStyle === "icons") {
    classes = "grid gap-2 bookmark-list";
    style.gridTemplateColumns = "repeat(auto-fill, minmax(60px, 1fr))";
  }
  return (
    <ul className={classNames(classes, "mb-2", layout?.header === false ? "" : "mt-3")} style={style}>
      {bookmarks.map((bookmark) => (
        <Item
          key={`${bookmark.name}-${bookmark.href}`}
          bookmark={bookmark}
          iconOnly={layout?.iconsOnly || bookmarksStyle === "icons"}
        />
      ))}
    </ul>
  );
}
