/**
 * Praktyczne cytaty dnia: [tekst po polsku, autor].
 * Tylko cytaty, których źródło jest znane. Gdy brzmienie jest streszczeniem myśli autora, a nie jego słowami,
 * autor ma dopisek „(parafraza)”. Nie dodawaj popularnych „cytatów” z internetu bez sprawdzenia źródła.
 */
export const DAILY_FUEL_QUOTE_LIST: readonly (readonly [string, string])[] = [
  // Carl Jung
  ['Kto patrzy na zewnątrz, śni. Kto patrzy do wewnątrz, budzi się.', 'Carl Jung'],
  ['Wszystko, co nas irytuje w innych, może nas doprowadzić do zrozumienia samych siebie.', 'Carl Jung'],
  ['Nie można niczego zmienić, dopóki się tego nie zaakceptuje. Potępianie nie wyzwala, tylko uciska.', 'Carl Jung'],
  ['Nikt nie staje się oświecony, wyobrażając sobie postacie światła, tylko uświadamiając sobie własną ciemność.', 'Carl Jung'],
  ['Znajomość własnej ciemności to najlepsza metoda radzenia sobie z ciemnością innych ludzi.', 'Carl Jung'],
  ['But, który pasuje jednemu, uwiera drugiego. Nie ma przepisu na życie, który pasuje do wszystkich.', 'Carl Jung'],
  ['Samotność nie bierze się z braku ludzi wokół, tylko z niemożności przekazania im tego, co dla ciebie ważne.', 'Carl Jung'],
  ['Spotkanie dwóch osobowości jest jak zetknięcie dwóch substancji chemicznych: jeśli zajdzie reakcja, obie się zmieniają.', 'Carl Jung'],
  ['Dopóki nie uświadomisz sobie nieświadomego, będzie ono kierować twoim życiem, a ty nazwiesz to losem.', 'Carl Jung (parafraza)'],
  ['Gdzie rządzi miłość, tam nie ma woli władzy. Gdzie przeważa władza, tam brakuje miłości.', 'Carl Jung'],

  // Alex Hormozi
  ['Zrób ofertę tak dobrą, że ludzie poczują się głupio, mówiąc „nie”.', 'Alex Hormozi'],
  ['Wolumen niweluje szczęście. Im więcej prób, tym mniej zależysz od losu.', 'Alex Hormozi'],
  ['Wartość = wymarzony efekt × pewność, że go osiągnę, podzielone przez czas czekania × wysiłek i poświęcenie.', 'Alex Hormozi'],
  ['Najpierw rób więcej. Potem rób lepiej. Dopiero na końcu rób coś nowego.', 'Alex Hormozi'],
  ['Zasada 100: przez 100 dni rób 100 kontaktów dziennie. Potem dopiero oceniaj, czy coś działa.', 'Alex Hormozi'],
  ['Nie musisz mieć więcej informacji. Musisz wykonać więcej powtórzeń tego, co już wiesz.', 'Alex Hormozi (parafraza)'],
  ['Pierwsze sto razy będą słabe. Taki jest koszt dotarcia do setnego razu, który jest dobry.', 'Alex Hormozi (parafraza)'],
  ['Skróć czas do pierwszego efektu klienta. Szybki pierwszy sukces sprzedaje lepiej niż najlepsza obietnica.', 'Alex Hormozi (parafraza)'],
  ['Sprzedawaj to, czego ludzie chcą, a dawaj im to, czego potrzebują.', 'Alex Hormozi'],
  ['Jeśli nie wiesz, co robić, zrób to, co przybliża cię do pieniędzy lub do umiejętności, które je dają.', 'Alex Hormozi (parafraza)'],

  // Steve Hardison
  ['Integralność to robienie tego, co powiedziałeś, że zrobisz, wtedy, kiedy powiedziałeś, i tak, jak powiedziałeś.', 'Steve Hardison (parafraza)'],
  ['Twoje słowo jest najcenniejszą rzeczą, jaką masz. Każda niedotrzymana drobna obietnica je dewaluuje.', 'Steve Hardison (parafraza)'],
  ['Najpierw stajesz się kimś, potem robisz to, co ta osoba robi, i dopiero wtedy masz to, co ona ma.', 'Steve Hardison (parafraza)'],
  ['Zadeklaruj, kim jesteś, i zachowuj się zgodnie z tą deklaracją, zanim pojawią się dowody.', 'Steve Hardison (parafraza)'],

  // Sprzedaż i negocjacje
  ['„Nie” to początek negocjacji, a nie jej koniec.', 'Chris Voss'],
  ['Zanim przekonasz kogoś do czegokolwiek, nazwij na głos to, co czuje. Etykietowanie rozbraja opór.', 'Chris Voss (parafraza)'],
  ['Pytaj „jak” i „co”, a nie „dlaczego”. „Dlaczego” brzmi jak oskarżenie.', 'Chris Voss (parafraza)'],
  ['Ludzie zrobią więcej, by uniknąć straty, niż by zyskać coś o tej samej wartości.', 'Robert Cialdini (parafraza)'],
  ['Ludzie mówią „tak” tym, których lubią. Podobieństwo i szczere komplementy to nie manipulacja, tylko kontakt.', 'Robert Cialdini (parafraza)'],
  ['Pokaż mi zachęty, a pokażę ci wynik.', 'Charlie Munger'],
  ['Naucz się sprzedawać. Naucz się budować. Jeśli potrafisz jedno i drugie, nikt cię nie zatrzyma.', 'Naval Ravikant'],
  ['Rób rzeczy, które się nie skalują.', 'Paul Graham'],

  // Decyzje i myślenie
  ['Odwróć problem, zawsze odwracaj. Zapytaj, co gwarantowałoby porażkę, i tego unikaj.', 'Charlie Munger'],
  ['Zadziwiające, ile przewagi zdobyliśmy, starając się konsekwentnie nie być głupimi, zamiast próbować być bardzo inteligentni.', 'Charlie Munger'],
  ['Ból + refleksja = postęp.', 'Ray Dalio'],
  ['Nie ma nic bardziej bezużytecznego niż sprawne robienie czegoś, czego w ogóle nie powinno się robić.', 'Peter Drucker'],
  ['Efektywność to robienie rzeczy dobrze. Skuteczność to robienie dobrych rzeczy.', 'Peter Drucker'],
  ['Najważniejsze jest to, żeby najważniejsze pozostało najważniejsze.', 'Stephen Covey'],
  ['Rezygnacja w porę zwykle wydaje się rezygnacją za wcześnie.', 'Annie Duke'],
  ['Większość decyzji to drzwi dwukierunkowe. Podejmuj je szybko, bo zawsze możesz wrócić.', 'Jeff Bezos (parafraza)'],
  ['Jasność co do tego, co ważne, daje jasność co do tego, co nieważne.', 'Cal Newport'],
  ['Szukaj bogactwa, nie pieniędzy ani statusu.', 'Naval Ravikant'],
  ['Graj w długie gry z ludźmi, którzy też grają w długie gry.', 'Naval Ravikant'],
  ['Wiedza specyficzna to wiedza, której nikt nie może cię wyszkolić. Gdyby mógł, wyszkoliłby kogoś tańszego.', 'Naval Ravikant (parafraza)'],
  ['Unikaj gier o sumie zerowej. Buduj reputację i partnerstwa, w których wygrywają obie strony.', 'Naval Ravikant (parafraza)'],

  // Nawyki, system, dyscyplina
  ['Nie wznosisz się do poziomu swoich celów. Spadasz do poziomu swoich systemów.', 'James Clear'],
  ['Każde działanie to głos oddany na osobę, którą chcesz się stać.', 'James Clear'],
  ['Nawyki to procent składany samorozwoju.', 'James Clear'],
  ['Zmniejsz nawyk do dwóch minut. Najpierw zostań kimś, kto się pojawia, potem dopiero zwiększaj.', 'James Clear (parafraza)'],
  ['Dyscyplina równa się wolność.', 'Jocko Willink'],
  ['Nie ma złych zespołów, są tylko źli liderzy.', 'Jocko Willink'],
  ['Weź pełną odpowiedzialność za wszystko w swoim świecie. Zero wymówek.', 'Jocko Willink (parafraza)'],
  ['Jeśli musisz zjeść żabę, zjedz ją z samego rana. Najtrudniejsze zadanie rób jako pierwsze.', 'Brian Tracy (parafraza)'],
  ['Łatwe wybory, trudne życie. Trudne wybory, łatwe życie.', 'Jerzy Gregorek'],
  ['Porównuj się z tym, kim byłeś wczoraj, a nie z tym, kim ktoś inny jest dziś.', 'Jordan Peterson'],
  ['Zrób porządek we własnym domu, zanim zaczniesz krytykować świat.', 'Jordan Peterson'],
  ['Kiedy myślisz, że jesteś skończony, jesteś dopiero na 40% swoich możliwości.', 'David Goggins (parafraza)'],

  // Emocje, stoicy, lęk
  ['Częściej cierpimy w wyobraźni niż w rzeczywistości.', 'Seneka'],
  ['Ludzi niepokoją nie rzeczy, tylko ich opinie o tych rzeczach.', 'Epiktet'],
  ['Przeszkoda w działaniu napędza działanie. To, co stoi na drodze, staje się drogą.', 'Marek Aureliusz'],
  ['Kiedy nie możemy już zmienić sytuacji, stajemy przed wyzwaniem, by zmienić siebie.', 'Viktor Frankl'],
  ['Kto ma „po co” żyć, zniesie prawie każde „jak”.', 'Friedrich Nietzsche'],
  ['Sukces w życiu mierzy się zwykle liczbą niewygodnych rozmów, które jesteś gotów przeprowadzić.', 'Tim Ferriss'],
  ['To, czego najbardziej boimy się zrobić, jest zwykle tym, co najbardziej musimy zrobić.', 'Tim Ferriss'],
  ['Zdefiniuj swoje lęki zamiast celów: co najgorszego się stanie, jak temu zapobiec, jak to naprawić.', 'Tim Ferriss (parafraza)'],

  // Ciało, sen, energia
  ['Im krótszy sen, tym krótsze życie.', 'Matthew Walker'],
  ['Sen to nie luksus do odrobienia w weekend. Niedoboru snu nie da się w pełni „odespać”.', 'Matthew Walker (parafraza)'],
  ['Światło dzienne w pierwszej godzinie po przebudzeniu ustawia zegar biologiczny na cały dzień.', 'Andrew Huberman (parafraza)'],

  // Pieniądze
  ['Oszczędzanie to różnica między twoim ego a twoim dochodem.', 'Morgan Housel'],
  ['Bogactwo to to, czego nie widzisz: samochody, których nie kupiłeś, i pieniądze, których nie wydałeś.', 'Morgan Housel (parafraza)'],
  ['Dopóki wymieniasz czas na pieniądze, twoje zarobki ogranicza liczba godzin w dobie.', 'MJ DeMarco (parafraza)'],
  ['Przestań być tylko konsumentem. Producent kupuje sobie wolność tym, co tworzy.', 'MJ DeMarco (parafraza)'],
  ['Ludzie przeceniają to, co zrobią w rok, i nie doceniają tego, co zrobią w dziesięć lat.', 'Bill Gates (parafraza)'],

  // Mistrzostwo i praca
  ['Przyszłość należy do tych, którzy uczą się więcej umiejętności i łączą je w twórczy sposób.', 'Robert Greene'],
  ['Bądź tak dobry, żeby nie dało się ciebie zignorować.', 'Steve Martin'],
  ['Jeśli nie wstydzisz się pierwszej wersji produktu, wypuściłeś ją za późno.', 'Reid Hoffman'],
  ['Głęboka praca to zdolność skupienia się bez rozpraszania na zadaniu wymagającym poznawczo. Rzadka i dlatego cenna.', 'Cal Newport (parafraza)'],
  ['Podwój liczbę eksperymentów w roku, a podwoisz swoją pomysłowość.', 'Jeff Bezos (parafraza)'],
];
