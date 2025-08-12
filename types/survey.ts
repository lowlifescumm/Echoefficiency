export type Question = {
  id: string;
  type: 'text' | 'multipleChoice' | 'checkbox' | 'rating';
  text: string;
  options?: string[];
};

export type LogicPredicate = {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
};

export type Block = {
  id: string;
  title?: string;
  questions: Question[];
  displayLogic?: LogicPredicate[];
};

export type Page = {
  id:string;
  title?: string;
  blocks: Block[];
};

export type Survey = {
  id: string;
  title: string;
  pages: Page[];
};
