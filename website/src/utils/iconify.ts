import { type Link } from "~/types/baseSchemas";

export const fetchIconData = async (link: Link): Promise<string | null> => {
  const { prefix, name } =
    typeof link.icon === "string"
      ? { prefix: link.icon.split(":")[0], name: link.icon.split(":")[1] }
      : link.icon ?? getFallbackIconInfo(link.type, link.url || "#");
  try {
    console.log(`Fetching icon: ${prefix}:${name}`);
    const response = await fetch(
      `https://api.iconify.design/${prefix}.json?icons=${name}`,
      {
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${response.status}`);
    }

    const data = await response.json();

    // Check if the icon exists in the response
    if (data && data.icons && data.icons[name]) {
      const iconData = data.icons[name];

      // Extract the path data from the response
      if (iconData.body) {
        return iconData.body;
      }
    }

    throw new Error("Icon not found in response");
  } catch (error: any) {
    console.error("Error fetching icon:", error);

    // Try to fetch fallback icon
    const fallback = getFallbackIconInfo(link.type, link.url || "#");
    if (fallback.prefix !== prefix || fallback.name !== name) {
      return fetchIconData({
        type: link.type,
        url: link.url || "#",
        name: fallback.name,
        icon: `${fallback.prefix}:${fallback.name}`,
      });
    }

    return null;
  }
};

export const getFallbackIconInfo = (
  type: Link["type"],
  url: string
): { prefix: string; name: string } => {
  if (type === "download" && url.endsWith(".pdf")) {
    return { prefix: "mdi", name: "file-pdf-box" };
  } else if (type === "contact") {
    return { prefix: "mdi", name: "card-account-details" };
  } else {
    return { prefix: "mdi", name: "link-variant" };
  }
};
