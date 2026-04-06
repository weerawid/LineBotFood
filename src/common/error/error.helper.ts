export function logErrorMessage(e: unknown): string;
export function logErrorMessage(params: {
  error: unknown;
  tag?: string;
  desc?: string;
}): string;

export function logErrorMessage(
  arg: unknown | {
    error: unknown;
    tag?: string;
    desc?: string;
  }
): string {

  let error: unknown;
  let tag = "systems";
  let desc = "Unexpected Error";

  if (typeof arg === "object" && arg !== null && "error" in arg) {
    const obj = arg as {
      error: unknown;
      tag?: string;
      desc?: string;
    };

    error = obj.error;
    tag = obj.tag ?? tag;
    desc = obj.desc ?? desc;
  } else {
    error = arg;
  }

  var message = ""
  if (error instanceof Error) {
    message = error.message
  } else {
    message = JSON.stringify(error)
  }

  console.error(`[${tag}] ${desc}: ${message}`);
  return message;
}