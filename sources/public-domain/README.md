# Public-domain source texts

Full texts of books the grammars already cite, so the record can be read and searched in full. Each is the
OCR text archive.org made from a scan (`*_djvu.txt`), unedited: expect old spellings (the long s read as f),
broken lines and scan errors. Quote from the scan, not from this text, when the wording matters.

Public domain: every book here was published before 1930 (US public domain). The year below is the one
archive.org records for the scanned edition.

| Title | Author | Year | Source | File |
|---|---|---|---|---|
| Ptolemy's Tetrabiblos, or Quadripartite: being four books of the influence of the stars | Ptolemy, active 2nd century | 1822 | [ptolemystetrabi00procgoog](https://archive.org/details/ptolemystetrabi00procgoog) | `ptolemystetrabi00procgoog.txt` |
| Brihat Jataka English Translation Chidambaram Iyer N. 1885 | Madhavi Choudhary | 1885 | [brihatjatakaenglishtranslationchidambaramiyern.1885_202003_820_](https://archive.org/details/brihatjatakaenglishtranslationchidambaramiyern.1885_202003_820_) | `brihatjatakaenglishtranslationchidambaramiyern.1885_202003_820_.txt` |
| Christian Astrology by William Lilly |  | 1659 | [ChristianAstrologyByWilliamLilly](https://archive.org/details/ChristianAstrologyByWilliamLilly) | `ChristianAstrologyByWilliamLilly.txt` |
| Christian Astrology, Editions from 1647-2022 |  | 1647 | [christian-astrology-1647](https://archive.org/details/christian-astrology-1647) | `christian-astrology-1647.txt` |
| The Five Books Of M. Manilius Ancient Astronomy | AncientHistoryWorks | 1700 | [TheFiveBooksOfM.ManiliusAncientAstronomy](https://archive.org/details/TheFiveBooksOfM.ManiliusAncientAstronomy) | `TheFiveBooksOfM.ManiliusAncientAstronomy.txt` |
| The Venus Tablets of Ammizaduga (1928) | Langdon, Stephen and Fotheringham, John Knight  | 1928 | [TheVenusTabletsOfAmmizaduga1928](https://archive.org/details/TheVenusTabletsOfAmmizaduga1928) | `TheVenusTabletsOfAmmizaduga1928.txt` |
| Astrology for all: to which is added a complete system of predictive ... | Alan Leo | 1899 | [astrologyforall00leogoog](https://archive.org/details/astrologyforall00leogoog) | `astrologyforall00leogoog.txt` |
| Astrology: How to Make and Read Your Own Horoscope | | ? | [astrologyhowtoma46963gut](https://archive.org/details/astrologyhowtoma46963gut) | not included: year None: not clearly public domain |
| Christian astrology ... in three books. The first containing the use of an ephemeris ... The second ... how to judge or resolve all manner of questions ... The third ... to judge upon nativities | Lilly, William, 1602-1681 | 1647 | [b30338724](https://archive.org/details/b30338724) | `b30338724.txt` |
| How to judge a nativity : the reading of the horoscope | Leo, Alan | 1928 | [howtojudgenativi00leoa](https://archive.org/details/howtojudgenativi00leoa) | `howtojudgenativi00leoa.txt` |
| The reports of the magicians and astrologers of Nineveh and Babylon in the British Museum : the original texts, printed in Cuneiform characters; edited with translations, notes, vocabulary, index, and an introduction | | 1900 | [reportsofmagicia07thomuoft](https://archive.org/details/reportsofmagicia07thomuoft) | not included: download failed: HTTP Error 500: Internal Server Error |
| 1885 -The Brihat Jataka Of Varaha Mihira | N Chidambaram Iyer | 1885 | [wg1079](https://archive.org/details/wg1079) | `wg1079.txt` |
| A manual of astrology, or The book of the stars, by Raphael | Robert Cross Smith | 1828 | [amanualastrolog00smitgoog](https://archive.org/details/amanualastrolog00smitgoog) | `amanualastrolog00smitgoog.txt` |

Search: a hybrid keyword + meaning search over these texts is built by `astro_texts_index.py` in the private
recursive-transcripts repo (corpus/astrology-texts).

Page links: `passage_pages.json` maps every indexed passage (150-word chunks) to its scanned page on
archive.org (`/details/<id>/page/n<leaf>/mode/1up`), made from each book's djvu.xml by
`scripts/astro_texts_pages.py`. The Chart Lab shelf (`mock-data/passages.json`) takes its book links from it.
