import { GlobalWorkerOptions, version, getDocument } from "pdfjs-dist";
import { useCallback, useEffect, useState } from "react";

import { useHtmlParse, type SectionType } from "./useHtmlParse";

type ReturnType = {
  loadPdfUrl: (pdfUrl: string) => void;
  pdfHtml: string;
  sections: SectionType[];
};

const h2Regex = /^第.{1,2}条[^、,。].+$/gm;
const pTextRegex = /<\/p>\s*<p>/gm;

export const usePdfLoad = (): ReturnType => {
  const { sections, htmlParse } = useHtmlParse();
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

  const [pdfHtml, setPdfHtml] = useState<string>("");

  const loadPdfUrl = useCallback((pdfUrl: string) => {
    const loadingTask = getDocument(pdfUrl);
    loadingTask.promise.then((pdf) => {
      const numPages = pdf.numPages;
      [...Array(numPages)].map((_, index) => {
        pdf.getPage(index + 1).then((page) => {
          page.getTextContent().then((textContent) => {
            const text = textContent.items.map(
              (item) => "str" in item && generateStrHtml(item.str)
            );
            const prevText = index === 0 ? "" : "\n\n";
            setPdfHtml(
              (prev) =>
                prev + `${prevText}${text.join("").replace(pTextRegex, "")}`
            );
          });
        });
      });
    });
  }, []);

  useEffect(() => {
    pdfHtml && htmlParse(pdfHtml);
  }, [pdfHtml, htmlParse]);

  return {
    loadPdfUrl,
    pdfHtml,
    sections,
  };
};

const generateStrHtml = (str: string) => {
  if (str.match(h2Regex)) {
    const id = str.substring(0, str.indexOf("条")).replace("第", "");
    // NOTE: idを全角数字の時に、半角にする
    const formattedId = id.replace(/[０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 65248);
    });
    return `<h2 id="pdfSection-${formattedId}">${str}</h2>`;
  }
  return `<p>${str || "\n\n"}</p>`;
};
