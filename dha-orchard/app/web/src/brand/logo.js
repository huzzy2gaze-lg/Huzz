// The company logo: the gold WH emblem. The CSS variable --logo lets the shine animation use the same shape.
import LOGO_FILE from "./logo-file.js";

export function logo() {
  return `<span class="logomark" style="--logo:url('${LOGO_FILE}')"><img src="${LOGO_FILE}" alt=""></span>`;
}
