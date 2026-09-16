export interface ActiveState {
  bold: boolean;
  italic: boolean;
  h1: boolean;
  h2: boolean;
  list: boolean;
  numList: boolean;
  underline: boolean;
  strikethrough: boolean;
  blockquote: boolean;
}

export interface SlashCommand {
  key: string;
  label: string;
  sub: string;
  icon: string;
}

export interface WikiNoteItem {
  id: string;
  title: string;
}
