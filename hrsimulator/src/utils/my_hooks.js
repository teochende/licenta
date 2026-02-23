import { useState } from 'react'

/**
 * Un custom hook pentru a stoca date in localStorage.
 * @param {string} cheie - Cheia sub care se va stoca valoarea in localStorage.
 * @param {*} valoareInitiala - Valoarea initiala care va fi folosita daca nu exista nicio valoare stocata.
 * @returns {[*, function]} - Returneaza un array cu valoarea stocata si o functie pentru a actualiza aceasta valoare.
 */
export function useMyLocalStorage(cheie, valoareInitiala={}) {
    //
    const [dateStorage, setDateStorage] = useState(() => {
        const valoareStocata = localStorage.getItem(cheie)
        return valoareStocata ? JSON.parse(valoareStocata) : valoareInitiala
    })
    //localStorage.setItem(cheie, JSON.stringify(dateStorage))
    //console.log("useMyLocalStorage: dateStorage:", dateStorage)
    function setStorage(valoareNoua) {
        console.log("setare local storage cu hook-ul meu:", cheie, valoareNoua)
        setDateStorage(valoareNoua)
        localStorage.setItem(cheie, JSON.stringify(valoareNoua))
    }

    return [dateStorage, setStorage]
}