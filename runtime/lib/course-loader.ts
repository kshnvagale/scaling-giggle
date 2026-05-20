export async function loadCoursePackage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load course package: ${res.status}`);
  const data = await res.json();
  // Runtime validation happens server-side when replacing mock with real package.
  // Client trusts the JSON shape for v1.
  return data;
}
