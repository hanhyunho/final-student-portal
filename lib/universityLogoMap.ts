export type UniversityLogoMap = Record<string, string>;

export const universityLogoMap: UniversityLogoMap = {};

let universityLogoMapPromise: Promise<UniversityLogoMap> | null = null;

export async function getUniversityLogoMap() {
  if (!universityLogoMapPromise) {
    universityLogoMapPromise = fetch("/api/university-logos", {
      method: "GET",
      cache: "force-cache",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch university logos: ${response.status}`);
        }

        const result = (await response.json()) as {
          ok?: boolean;
          logoMap?: UniversityLogoMap;
        };

        const nextLogoMap = result.ok && result.logoMap ? result.logoMap : {};
        Object.assign(universityLogoMap, nextLogoMap);
        return universityLogoMap;
      })
      .catch((error) => {
        universityLogoMapPromise = null;
        throw error;
      });
  }

  return universityLogoMapPromise;
}

export function getUniversityLogoUrl(university: string) {
  return universityLogoMap[university] ?? "";
}
