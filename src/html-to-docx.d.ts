declare module 'html-to-docx' {
  const htmlToDocx: (htmlString: string, headerHTML?: string | null, documentOptions?: any, footerHTML?: string | null) => Promise<Blob>;
  export default htmlToDocx;
}
