import prompts from 'prompts';

// CAF-INIT-SMART-01: the one door to `prompts`. Interactive runs pass straight through, so
// behavior (and `prompts.inject` in tests) is unchanged. In "auto" mode (`--yes`, non-TTY, or a
// step run by the smart scaffold flow after the user confirmed the summary) nothing is shown: each
// question is answered with its own default, so a prompt can never block an unattended run.
//
// Default of a question: `auto` if the call site sets it (an answer that differs from the visible
// default, e.g. the top golden-example candidate), else `initial` for confirm/text, the `initial`
// choice (first by default) for select, and the choices ticked with `selected` for multiselect.
let autoMode = false;

export function setAutoAnswers(value) {
  autoMode = Boolean(value);
}

export function isAutoAnswers() {
  return autoMode;
}

/** Runs `fn` with auto mode on, restoring the previous mode afterwards. */
export async function withAutoAnswers(fn) {
  const previous = autoMode;
  autoMode = true;
  try {
    return await fn();
  } finally {
    autoMode = previous;
  }
}

export function defaultAnswer(question) {
  if (Object.hasOwn(question, 'auto')) return question.auto;
  const { type, choices = [] } = question;
  const initial = question.initial;
  switch (type) {
    case 'confirm':
      return initial ?? true;
    case 'text':
      return initial ?? '';
    case 'select': {
      const index = typeof initial === 'number' ? initial : 0;
      return choices[index]?.value;
    }
    case 'multiselect':
      return choices.filter((c) => c.selected).map((c) => c.value);
    default:
      return initial;
  }
}

export default async function ask(question, options) {
  if (!autoMode) return prompts(question, options);
  const questions = [].concat(question);
  const answers = {};
  for (const q of questions) answers[q.name] = defaultAnswer(q);
  return answers;
}
