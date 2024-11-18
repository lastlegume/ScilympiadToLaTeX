const extra = document.getElementById("extra");
const template = document.getElementById("template");

document.querySelector("form").addEventListener("submit", generateLaTeX);
template.addEventListener("change", toggleVisibility);

function toggleVisibility() {
    extra.hidden = !extra.hidden;
}
async function generateLaTeX(e) {
    e.preventDefault();
    let queryOptions = { active: true, lastFocusedWindow: true };
    let [tab] = await browser.tabs.query(queryOptions);

    var mc = document.getElementById("mc").value;
    var ms = document.getElementById("ms").value;
    var tf = document.getElementById("tf").value;
    var sa = document.getElementById("sa").value;
    var preamble = document.getElementById("preamble").checked;
    var gradetable = document.getElementById("gradetable").checked;
    var intro = document.getElementById("intro").checked;
    var conclusion = document.getElementById("conclusion").checked;
    var images = document.getElementById("images").checked;
    var removeChevrons = document.getElementById("removeChevrons").checked;
    var figures = document.getElementById("figures").checked;
    var selectall = document.getElementById("selectall").checked;
    var templateBoolean = template.checked;
    var templateText = await fetch("template.txt");
    templateText = await templateText.text();
    if (template.checked) {
        preamble = false;
        gradetable = false;
    }

    browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: create,
        args: [mc, ms, tf, sa, preamble, gradetable, intro, conclusion, images, removeChevrons, figures, selectall, templateBoolean, templateText],
    });
}

function create(mc, ms, tf, sa, preamble, gradetable, intro, conclusion, images, removeChevrons, figures, selectall, template, templateText) {
    var questions = document.getElementsByClassName("panel panel-default");
    var began = false;

    var code = "";
    if (template) {
        code = templateText;
    } else {
        code = "% This text was generated using the ScilympiadToLaTeX extension on the Firefox Add-Ons Store at https://addons.mozilla.org/en-US/firefox/addon/scilympiadtolatex/ \n%This extension does not support math, different fonts, different paragraph spacings, or proper image placement. For instance, images might be on wrong pages and solution boxes may be incorrectly sized. Please look through the test and resize figures or add page breaks where needed.  \n" + (preamble ? "\\documentclass{exam}\n\\usepackage{graphicx}\n% You can remove the hyperref package if the test doesn't have hyperlinks \n\\usepackage{hyperref}\n% You can remove setspace if you don't change the line spacing\n\\usepackage{setspace}\n" + (gradetable ? "\\usepackage{mhchem}\n" : "") + "\\addpoints\n\\begin{document}\n\n% This space is intentionally left blank for a title page.\n" : "% Please verify that \\usepackage{graphicx} (for images) " + (gradetable ? "and \\usepackage{mhchem} (for the gradetable resizing) are " : "is ") + "in the preamble if there are images within your test \n% Please verify that \\usepackage{hyperref} is in the preamble if there are hyperlinks within your test \n\n");
        if (gradetable) {
            code += "% The number of rows in the grade table is determined by the number of questions. You will probably need to adjust it to better fit the document.\n\\multirowgradetable{\\the\\numexpr\\numpages/13+1}[pages]\n\n";
        }
    }

    if (intro) {
        intro = document.getElementsByClassName("form-horizontal")[0].children[3].innerHTML;
        if (template) {
            code = code.replaceAll('<####?->Intro will be copied here<-?####>', "% This is the introduction text \n \\item " + clean(insertEscapes(intro)).replaceAll(/(\$[&`'])/g, "$$$1") + " \n");
        } else {
            code += "% This is the introduction text \n" + clean(insertEscapes(intro)) + " \n\n";
        }
    } else if (template) {
        code = code.replaceAll('<####?->Intro will be copied here<-?####>', "");
    }
    if (preamble) {
        code += "\\newpage\n\n";
    }
    var questionText = "";

    for (let i = 0; i < questions.length; i++) {
        var question = questions[i].innerHTML.toString();
        //question = questions[i].innerText;
        //
        question = insertEscapes(question.substring(44).trim());
        if (question.substring(0, 9) === "<div><div") {
            if (!began) {
                if (!template)
                    code += "\\begin{questions}\n";
                began = true;
            }
            question = question.substring(45).toString();
            while (question.substring(0, 1) !== "(")
                question = question.substring(1);
            question = question.substring(1);
            var n = 0;
            while (question.substring(n, n + 1) !== ")")
                n++;
            var points = question.substring(0, n - 7);
            var k = n + 2;
            while (question.substring(k, k + 3) !== ";\">")
                k++;
            k += 3;
            if (question.substring(k, k + 3) === "<p>")
                k += 3;

            var end = k;
            while (question.substring(end, end + 6) !== "</div>" && end < question.length)
                end++;

            var qText = question.substring(k, end) + "      ";
            //  qText = insertEscapes(qText);
            qText = clean(qText).trim();
            // console.log(question);
            var answer = "";
            while (end + 24 < question.length && question.substring(end, end + 24) !== "<div class=\"panel-body\">")
                end++;
            var start = end + 24;
            while (start + 7 < question.length && (question.substring(start, start + 7) !== "class=\"" && question.substring(start, start + 7) !== " type=\"")) {
                start++;
            }
            start += 7;
            if (question.substring(start, start + 12) === "text-warning") {
                //short answer
                answer += "\\begin{" + sa + "}";
                var expected = start + 38;
                while (expected < question.length && question.substring(expected, expected + 6) !== "</div>")
                    expected++;
                let size = Math.min(6, Math.max(2, Math.round((expected - start - 38) / 100) + 1));
                answer += ((sa.includes("solutionbox")) ? "{" : "[") + size + "cm" + ((sa.includes("solutionbox")) ? "}" : "]") + " \n";
                answer += question.substring(start + 38, expected);
                answer += "\n\\end{" + sa + "}";
            } else if (question.substring(start, start + 8) === "input-sm") {
                //fill in the blank
                answer += "\\\\\n\\fillin[";
                var expected = start + 8;
                while (expected < question.length && question.substring(expected, expected + 7) !== "value=\"")
                    expected++;
                var blankEnd = expected + 7;
                while (blankEnd < question.length && question.substring(blankEnd, blankEnd + 1) !== "\"")
                    blankEnd++;
                answer += question.substring(expected + 7, blankEnd);
                answer += "][\\textwidth]";

            } else if (question.substring(start, start + 5) === "radio") {
                //true false and multiple choice
                var choices = questions[i].children[1].innerHTML.toString();
                var truefalse = !choices.includes("\"clear:both;\"") && choices.includes("True") && choices.includes("False") && !choices.includes("A)");
                if (truefalse)
                    answer += ((tf.includes("onepar")) ? "\\\\" : "") + "\\begin{" + tf + "}\n"
                else
                    answer += ((mc.includes("onepar")) ? "\\\\" : "") + "\\begin{" + mc + "}\n"
                var inStart = 0;
                var done = false;
                while (!done) {
                    while (choices.substring(inStart, inStart + 7) !== "<input ") {
                        inStart++;
                    }
                    if (choices.substring(inStart + 7, inStart + 14) === "checked")
                        answer += "\\correctchoice ";
                    else
                        answer += "\\choice ";
                    while (choices.substring(inStart, inStart + 1) !== ">")
                        inStart++;
                    inStart++;
                    var inEnd = inStart;
                    while (inEnd < choices.length - 6 && choices.substring(inEnd, inEnd + 7) !== "<input ") {
                        inEnd++;
                    }
                    var newInStart = inEnd;
                    if (choices.substring(inEnd, inEnd + 7) !== "<input ")
                        done = true;
                    var choice = choices.substring(inStart, inEnd).trim();

                    choice = clean(choice).trim();
                    if (/[A-I]\)/.test(choice.substring(0, 2))) {
                        choice = choice.substring(2);
                        var index = 0;
                        while (index < choice.length - 1) {
                            var nextChars = choice.substring(index, index + 14);

                            if (nextChars === "\"float:left;\">") {
                                inStart = index + 14;
                            }
                            if (nextChars === "<div style=\"cl") {
                                inEnd = index;
                            }
                            if (nextChars === "<div style=\"wi") {
                                inEnd = index;
                            }
                            index++;
                        }
                        answer += clean(choice.substring(inStart, inEnd)).trim() + "\n";
                    }
                    else {
                        answer += choice + "\n";
                    }
                    inStart = newInStart;
                }
                if (truefalse)
                    answer += "\\end{" + tf + "}"
                else
                    answer += "\\end{" + mc + "}"

            } else if (question.substring(start, start + 8) === "checkbox") {
                //multiple select
                if (selectall)
                    qText += " (select all that apply)";
                answer += ((ms.includes("onepar")) ? "\\\\" : "") + "\\begin{" + ms + "}\n"
                var choices = questions[i].children[1].innerHTML.toString();
                var inStart = 0;
                var done = false;
                while (!done) {
                    while (choices.substring(inStart, inStart + 7) !== "<input ") {
                        inStart++;
                    }
                    if (choices.substring(inStart + 7, inStart + 14) === "checked")
                        answer += "\\correctchoice ";
                    else
                        answer += "\\choice ";
                    while (choices.substring(inStart, inStart + 1) !== ">")
                        inStart++;
                    inStart++;
                    while (choices.substring(inStart, inStart + 1) !== ">")
                        inStart++;
                    inStart++;
                    var inEnd = inStart;
                    while (inEnd < choices.length - 6 && choices.substring(inEnd, inEnd + 7) !== "<input ") {
                        inEnd++;
                    }
                    var newInStart = inEnd;
                    if (choices.substring(inEnd, inEnd + 7) !== "<input ")
                        done = true;
                    var choice = choices.substring(inStart, inEnd);
                    //console.log(choice);

                    choice = clean(choice).trim();
                    if (/[A-I]\)/.test(choice.substring(0, 2))) {
                        choice = choice.substring(2);
                        var index = 0;
                        while (index < choice.length - 1) {
                            var nextChars = choice.substring(index, index + 14);

                            if (nextChars === "\"float:left;\">") {
                                inStart = index + 14;
                            }
                            if (nextChars === "<div style=\"cl") {
                                inEnd = index;
                            }
                            if (nextChars === "<div style=\"wi") {
                                inEnd = index;
                            }
                            index++;
                        }
                        answer += clean(choice.substring(inStart, inEnd)).trim() + "\n";
                    }
                    else {
                        answer += choice + "\n";
                    }
                    inStart = newInStart;
                }
                answer += "\\end{" + ms + "}"
            }
            var LaTeX = "\\question[" + points + "] " + qText + "\n" + answer;
            // console.log(LaTeX);
            // LaTeX = LaTeX.toString().replaceAll('\"', '\\\"');
            LaTeX = LaTeX.toString().replaceAll('&quot;', '"');
            // LaTeX = LaTeX.toString().replaceAll('\'', '\\\'');
            questionText += LaTeX + "\n";
        }
        else {
            // text block
            var textblock = clean(question);
            if(figures)
                textblock = textblock.replaceAll(/(.*?)(\\[begind]{3,5}{[\w\s]*?})/g, "\n\\fullwidth{$1}$2");
            else
                textblock = `\\fullwidth{\n${textblock}\n}`;
            questionText += "\n" + textblock + "\n";
        }
    }
    if (template) {
        questionText = questionText.replaceAll(/(\$[&`'])/g, "$$$1");
        code = code.replaceAll('<####?->Questions will be copied here<-?####>', questionText);
    } else {
        code += questionText;
        code += "\\end{questions}\n";
    }


    if (conclusion) {
        var conc = document.getElementsByClassName("panel panel-success");
        if (conc.length > 0) {
            conc = conc[0].children[0].innerHTML;
            var idx = 0;
            while (conc.substring(idx, idx + 1) !== ">") {
                idx++;
            }
            if (template) {
                code = code.replaceAll('<####?->Conclusion will be copied here<-?####>', "\\newpage \n% This is the conclusion \n" + clean(insertEscapes(conc.substring(idx + 1))).replaceAll(/(\$[&`'])/g, "$$$1") + " \n\n");
            } else {
                code += "\\newpage \n% This is the conclusion \n" + clean(insertEscapes(conc.substring(idx + 1))) + " \n\n";
            }
        }
    } else if (template) {
        code = code.replaceAll('<####?->Conclusion will be copied here<-?####>', "");
    }
    //end of document
    if (preamble)
        code += "\\end{document}";
    //   console.log(code);
    if (removeChevrons)
        code = code.toString().replaceAll(/<[^<>]*?>\s?/g, "");
    code = code.toString().replaceAll('&lt;', '<');
    code = code.toString().replaceAll('&gt;', '>');

    var file = new File([code], 'latex.txt', {
        type: 'text/plain',
    })
    download();
    function download() {
        const link = document.createElement('a')
        const url = URL.createObjectURL(file)

        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    }
    function clean(qText) {
        qText += "      ";
        qText = qText.toString().replaceAll("<u>", "\\underline{");
        qText = qText.toString().replaceAll("<b>", "\\textbf{");
        qText = qText.toString().replaceAll("<i>", "\\textit{");
        qText = qText.toString().replaceAll(/<font face=\"[^>]*?\">/g, "");
        qText = qText.toString().replaceAll(/\s?style=\"\"\s?/g, "");
        qText = qText.toString().replaceAll("<div>", "");
        //these are probably unneccesary because of the previous line
        qText = qText.toString().replaceAll(/<u [^>]*?>/g, "\\underline{");
        qText = qText.toString().replaceAll(/<b [^>]*?>/g, "\\textbf{");
        qText = qText.toString().replaceAll(/<i [^>]*?>/g, "\\textit{");
        for (let j = 0; j < qText.length; j++) {
            //  console.log(j+" out of "+qText.length);
            // console.log(qText);
            if (j + 7 < qText.length && qText.substring(j, j + 8) === " style=\"") {
                var tagStart = j;
                while (qText.substring(tagStart, tagStart + 1) !== "<")
                    tagStart--;
                if (qText.substring(tagStart, tagStart + 5) !== "<span" && qText.substring(j + 8, j + 13) !== "float" && qText.substring(j + 8, j + 13) !== "width") {
                    var start = j;
                    var styleStart = j + 8;
                    j = styleStart;
                    while (j < qText.length && qText.substring(j, j + 1) !== "\"")
                        j++;
                    var textStart = j;
                    while (textStart < qText.length && qText.substring(textStart, textStart + 1) !== ">")
                        textStart++;
                    textStart++;
                    var textEnd = textStart;
                    while (textEnd < qText.length && qText.substring(textEnd, textEnd + 2) !== "</")
                        textEnd++;
                    var text = processStyle(qText.substring(styleStart, j), qText.substring(textStart, textEnd));
                    //    console.log(qText.substring(textStart, textEnd));
                    j = textEnd + 1;
                    while (j < qText.length && qText.substring(j, j + 1) !== ">")
                        j++;
                    qText = qText.substring(0, start).trimEnd() + ">" + text + qText.substring(j + 1);
                    //  console.log("style " + qText);
                    j = tagStart;
                }
            }
            if (j + 2 < qText.length) {
                if (qText.substring(j, j + 4) === "<br>") {
                    qText = qText.substring(0, j) + (j + 5 > qText.length ? "\\\\" : "") + "\n" + qText.substring(j + 4);
                    j -= 5;
                }
                // if (qText.substring(j, j + 4) === "&gt;") {
                //     qText = qText.substring(0, j) + "<" + qText.substring(j + 4);
                //     j -= 5;
                // }
                // if (qText.substring(j, j + 4) === "&lt;") {
                //     qText = qText.substring(0, j) + ">" + qText.substring(j + 4);
                //     j -= 5;
                // }
                if (qText.substring(j, j + 4) === "</p>") {
                    qText = qText.substring(0, j) + "\n\n" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<ol>") {
                    qText = qText.substring(0, j) + "\n\\begin{enumerate}\n" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<ul>") {
                    qText = qText.substring(0, j) + "\n\\begin{itemize}\n" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<li>") {
                    qText = qText.substring(0, j) + "\n\t\\item " + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "</b>" || qText.substring(j, j + 4) === "</i>" || qText.substring(j, j + 4) === "</u>") {
                    qText = qText.substring(0, j) + "}" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<h1>") {
                    qText = qText.substring(0, j) + "\\section*{" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<h2>") {
                    qText = qText.substring(0, j) + "\\subsection*{" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<h3>") {
                    qText = qText.substring(0, j) + "\\subsubsection*{" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<h4>") {
                    qText = qText.substring(0, j) + "\\paragraph*{" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<h5>") {
                    qText = qText.substring(0, j) + "\\subparagraph*{" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "<h6>") {
                    qText = qText.substring(0, j) + "\\textbf*{" + qText.substring(j + 4);
                    j -= 5;
                }
                if (qText.substring(j, j + 4) === "img ") {
                    var idx = 0;
                    while (qText.substring(idx, idx + 5) !== "src=\"") {
                        idx++;
                    }
                    var imgStart = idx + 5;
                    idx += 5;
                    while (qText.substring(idx, idx + 1) !== "\"")
                        idx++;
                    var imgEnd = idx;
                    while (qText.substring(idx, idx + 1) !== ">")
                        idx++;
                    var imgString = qText.substring(imgStart, imgEnd).split("/").pop();
                    if (images)
                        downloadImage("https://scilympiad.com" + qText.substring(imgStart, imgEnd));
                    if(figures)
                        qText = qText.substring(0, j - 1) + "\\begin{figure}[!ht]\n\t\\centering\n\t\\includegraphics[width=.6\\textwidth,height=.3\\textheight,keepaspectratio]{" + imgString + "}\n\\end{figure}\n" + qText.substring(idx + 1);
                    else
                        qText = qText.substring(0, j - 1) + "\\begin{center}\n\t\\includegraphics[width=.6\\textwidth,height=.3\\textheight,keepaspectratio]{" + imgString + "}\n\\end{center}\n" + qText.substring(idx + 1);
                    j -= 5;
                }

            }
            if (j + 3 < qText.length) {
                if (qText.substring(j, j + 5) === "</ol>") {
                    qText = qText.substring(0, j) + "\n\\end{enumerate}" + qText.substring(j + 5);
                    j -= 6;
                }
                if (qText.substring(j, j + 5) === "</ul>") {
                    qText = qText.substring(0, j) + "\n\\end{itemize}" + qText.substring(j + 5);
                    j -= 6;
                }
                if (qText.substring(j, j + 5) === "</li>") {
                    qText = qText.substring(0, j) + qText.substring(j + 5);
                    j -= 6;
                }
                if (qText.substring(j, j + 5) === "<sup>") {
                    qText = qText.substring(0, j) + "$^{" + qText.substring(j + 5);
                    j -= 6;
                }
                if (qText.substring(j, j + 5) === "<sub>") {
                    qText = qText.substring(0, j) + "$_{" + qText.substring(j + 5);
                    j -= 6;
                }
                if (/<\/h[1-6]>/.test(qText.substring(j, j + 5))) {
                    qText = qText.substring(0, j) + "}" + qText.substring(j + 5);
                    j -= 6;
                }

            }
            if (j + 1 < qText.length) {
                if (qText.substring(j, j + 3) === "<p>") {
                    qText = qText.substring(0, j) + "\n" + qText.substring(j + 3);
                    j -= 4;
                }
                if (qText.substring(j, j + 3) === "<b>") {
                    qText = qText.substring(0, j) + "\\textbf{" + qText.substring(j + 3);
                    j -= 4;
                }
                if (qText.substring(j, j + 3) === "<i>") {
                    qText = qText.substring(0, j) + "\\textit{" + qText.substring(j + 3);
                    j -= 4;
                }
                if (qText.substring(j, j + 3) === "<u>") {
                    qText = qText.substring(0, j) + "\\underline{" + qText.substring(j + 3);
                    j -= 4;
                }
                if (qText.substring(j, j + 3) === "<a ") {
                    var hyperlink = "\\href{";
                    var linkStart = j;
                    while (qText.substring(linkStart, linkStart + 6) !== "href=\"")
                        linkStart++;
                    linkStart += 6;
                    var linkEnd = linkStart;
                    while (qText.substring(linkEnd, linkEnd + 1) !== "\"")
                        linkEnd++;
                    hyperlink += qText.substring(linkStart, linkEnd) + "}{";
                    linkStart = linkEnd;
                    while (qText.substring(linkStart, linkStart + 1) !== ">")
                        linkStart++;
                    linkStart++;
                    while (qText.substring(linkEnd, linkEnd + 4) !== "</a>")
                        linkEnd++;
                    hyperlink += qText.substring(linkStart, linkEnd) + "}";
                    qText = qText.substring(0, j) + hyperlink + qText.substring(linkEnd + 4);
                    j -= 4;
                }
            }
            if (j + 4 < qText.length) {
                if (qText.substring(j, j + 6) === "&nbsp;") {
                    qText = qText.substring(0, j) + qText.substring(j + 6);
                    j -= 7;
                }
                if (qText.substring(j, j + 6) === "</sup>" || qText.substring(j, j + 6) === "</sub>") {
                    qText = qText.substring(0, j) + "}$" + qText.substring(j + 6);
                    j -= 7;
                }
                if (qText.substring(j, j + 6) === "</div>") {
                    qText = qText.substring(0, j) + "" + qText.substring(j + 6);
                    j -= 7;
                }
                if (qText.substring(j, j + 6) === "<table") {
                    var tableText = "\\\\\n"+((figures)?"\\begin{table}[h!]":"\\begin{center}")+"\n";
                    var end = j;
                    while (end < qText.length && qText.substring(end, end + 8) !== "</tbody>") {
                        end++;
                    }
                    var table = qText.substring(j + 43, end).split("<tr>");
                    var length = (table[1].split("<td>")).length - 1;
                    tableText += ((figures)?"\\centering\n":"")+"\\begin{tabular}{";
                    while (length > 0) {
                        tableText += "|c";
                        length--;
                    }
                    tableText += "|}\n\\hline\n"
                    for (let t = 1; t < table.length; t++) {
                        var cells = table[t].split("<td>");
                        for (let cellnum = 1; cellnum < cells.length; cellnum++) {
                            if (cellnum != cells.length - 1)
                                tableText += cells[cellnum].substring(0, cells[cellnum].length - 5) + " & ";
                            else
                                tableText += cells[cellnum].substring(0, cells[cellnum].length - 10);
                        }
                        // table[t].replaceAll("<td>","");
                        // table[t].replaceAll("</td>","");
                        // table[t].replaceAll("</tr>","");
                        tableText += "\\\\\n\\hline\n";
                    }
                    tableText += "\\end{tabular}\\\\"+((figures)?"\n\\end{table}":"\n\\end{center}")+"\n";
                    qText = qText.substring(0, j) + tableText + qText.substring(end + 16);
                    j -= 7;
                }
                if (qText.substring(j, j + 6) === "<font ") {
                    var colorStart = j;
                    while (qText.substring(colorStart, colorStart + 7) !== "color=\"")
                        colorStart++;
                    colorStart += 8;
                    var colorEnd = colorStart;
                    while (qText.substring(colorEnd, colorEnd + 1) !== "\"")
                        colorEnd++;
                    var colorText = "\\textcolor[HTML]{" + qText.substring(colorStart, colorEnd) + "}{";
                    while (qText.substring(colorEnd, colorEnd + 1) !== ">")
                        colorEnd++;
                    qText = qText.substring(0, j) + colorText + qText.substring(colorEnd + 1);
                    //    console.log("font: " + qText);
                    colorEnd = j;
                    while (qText.substring(colorEnd, colorEnd + 7) !== "</font>")
                        colorEnd++;
                    qText = qText.substring(0, colorEnd) + "}" + qText.substring(colorEnd + 7);
                    j -= 7;
                }
                if (qText.substring(j, j + 6) === "<span ") {
                    var spanText = "";
                    //   console.log('before: '+qText);
                    var spanStart = j;
                    var styleStart = j;
                    while (styleStart < qText.length && qText.substring(styleStart, styleStart + 7) !== "style=\"")
                        styleStart++;
                    styleStart += 7;
                    j = styleStart;
                    while (j < qText.length && qText.substring(j, j + 1) !== "\"")
                        j++;
                    var textStart = j;
                    while (textStart < qText.length && qText.substring(textStart, textStart + 1) !== ">")
                        textStart++;
                    textStart++;
                    var textEnd = textStart;
                    while (textEnd < qText.length && qText.substring(textEnd, textEnd + 7) !== "</span>")
                        textEnd++;
                    spanText = processStyle(qText.substring(styleStart, j), qText.substring(textStart, textEnd));
                    qText = qText.substring(0, spanStart) + spanText + qText.substring(textEnd + 7);
                    //  console.log('after: '+qText);
                    // console.log("end span");
                    j = spanStart - 7;
                }
            }
            j = Math.max(0, j);
        }
        qText = qText.toString().replaceAll("</font>", "");
        return qText.trim();
    }
    function processStyle(styleString, text) {
        //  console.log(text);
        var styles = styleString.split(";");
        var latex = "";
        var opens = [];
        // console.log(styles);
        for (let i = 0; i < styles.length - 1; i++) {
            var style = styles[i].split(":");
            style[0] = style[0].trim();
            style[1] = style[1].trim();
            if (style[0] === "background-color") {
                style[1] = style[1].substring(4);
                style[1] = style[1].substring(0, style[1].length - 1);
                latex += "\\colorbox[RGB]{" + style[1] + "}{";
                opens.push("}");
            } else if (style[0] === "text-align") {
                if (style[1] === "center") {
                    latex += "\\begin{center}";
                    opens.push("\\end{center}");
                } else if (style[1] === "start" || style[1] === "left") {
                    latex += "\\begin{flushleft}";
                    opens.push("\\end{flushleft}");
                } else if (style[1] === "end" || style[1] === "right") {
                    latex += "\\begin{flushright}";
                    opens.push("\\end{flushright}");
                }

            } else if (style[0] === "color") {
                style[1] = style[1].substring(5);
                style[1] = style[1].substring(0, style[1].length - 1);
                latex += "\\textcolor[RGB]{" + style[1] + "}{";
                opens.push("}");
            }
            else if (style[0] === "font-size") {
                style[1] = style[1].substring(0,style[1].length - 2)*1;

                if (style[1] >= 24) {
                    latex += "\\begin{Huge}";
                    opens.push("\\end{Huge}");
                } else if (style[1] >= 20) {
                    latex += "\\begin{huge}";
                    opens.push("\\end{huge}");
                } else if (style[1] >= 17) {
                    latex += "\\begin{LARGE}";
                    opens.push("\\end{LARGE}");
                } else if (style[1] >= 14) {
                    latex += "\\begin{Large}";
                    opens.push("\\end{Large}");
                } else if (style[1] >= 12) {
                    latex += "\\begin{large}";
                    opens.push("\\end{large}");
                } else if (style[1] >= 10) {
                    latex += "\\begin{normalsize}";
                    opens.push("\\end{normalsize}");
                } else if (style[1] >= 9) {
                    latex += "\\begin{small}";
                    opens.push("\\end{small}");
                } else if (style[1] >= 8) {
                    latex += "\\begin{footnotesize}";
                    opens.push("\\end{footnotesize}");
                } else if (style[1] >= 7) {
                    latex += "\\begin{scriptsize}";
                    opens.push("\\end{scriptsize}");
                } else {
                    latex += "\\begin{tiny}";
                    opens.push("\\end{tiny}");
                }
            } else if (style[0] === "line-height") {
                latex += "{\\setstretch{" + style[1] + "}";
                opens.push("}");
            }
        }
        for (let i = opens.length - 1; i >= 0; i--) {
            text += opens[i];
        }
        //     console.log(""+latex+text);
        return "" + latex + text;
    }
    async function downloadImage(imageSrc) {
        const image = await fetch(imageSrc)
        const imageBlog = await image.blob()
        const imageURL = URL.createObjectURL(imageBlog)

        const link = document.createElement('a')
        link.href = imageURL;
        link.download = imageSrc.split("/").pop();
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }
    function insertEscapes(qText) {
        qText = qText.toString().replaceAll('$', '\\$');
        qText = qText.toString().replaceAll('&dollar;', '\\$');
        qText = qText.toString().replaceAll('%', '\\%');
        qText = qText.toString().replaceAll('&percnt;', '\\%');
        qText = qText.toString().replaceAll('&apos;', '\\\'');
        qText = qText.toString().replaceAll('&tilde;', '\\textasciitilde');
        qText = qText.toString().replaceAll('~', '\\textasciitilde');
        qText = qText.toString().replaceAll('^', '\\textasciicircum');
        qText = qText.toString().replaceAll('&Hat;', '\\textasciicircum');
        qText = qText.toString().replaceAll('{', '\\{');
        qText = qText.toString().replaceAll('}', '\\}');
        qText = qText.toString().replaceAll(/([^_])_([^_])/g, "$1\\_$2");
        qText = qText.toString().replaceAll('#', '\\#');
        qText = qText.toString().replaceAll('&num;', '\\#');
        // qText = qText.toString().replaceAll('&', '\\&');
        qText = qText.toString().replaceAll('&amp;', '\\&');
        qText = qText.toString().replaceAll('&nbsp;', '');
        if (qText.includes("_")||qText.includes("   ")) {
            var count = 0;
            for (let i = 0; i < qText.length; i++) {
                count = 0;
                if (qText.substring(i, i + 1) === "_"&&(i>0&&qText.substring(i-1, i) !== "\\")) {
                    while (qText.substring(i, i + 1) === "_") {
                        count++;
                        qText = qText.substring(0, i) + qText.substring(i + 1);
                    }

                    qText = qText.substring(0, i) + "\\underline{\\hspace{" + count + "ex}}" + qText.substring(i);
                }else if (i<qText.length-1&&qText.substring(i, i + 2) === "  ") {
                    while (qText.substring(i, i + 1) === " ") {
                        count++;
                        qText = qText.substring(0, i) + qText.substring(i + 1);
                    }
                    qText = qText.substring(0, i) + "\\hspace{" + count + "ex}" + qText.substring(i);
                }
            }
        }
        return qText;
    }
}