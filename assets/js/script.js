const getTypeColor = (type) => {
    const normal = "#F5F5F5";
    return (
        {
            normal,
            fire: "#FDDFDF",
            grass: "#DEFDE0",
            electric: "#FCF7DE",
            ice: "#DEF3FD",
            water: "#DEF3FD",
            ground: "#F4E7DA",
            rock: "#D5D5D4",
            fairy: "#FCEAFF",
            poison: "#98D7A5",
            bug: "#F8D5A3",
            ghost: "#CAC0F7",
            dragon: "#97B3E6",
            psychic: "#EAEDA1",
            fighting: "#E6E0D4",
        }[type] || normal
    );
};

let apiUrl = "https://pokeapi.co/api/v2/pokemon?limit=15&offset=0";
let totalRendered = 0;
const maxPokemons = 150;

const getOnlyFulfilled = async ({ func, arr }) => {
    const promises = arr.map(func);
    const responses = await Promise.allSettled(promises);

    return responses.filter((response) => response.status === "fulfilled");
};

const getPokemonsType = async (pokeApiResults) => {
    const fulfilled = await getOnlyFulfilled({
        arr: pokeApiResults,
        func: (result) => fetch(result.url),
    });

    const pokePromises = fulfilled.map((url) => url.value.json());
    const pokemons = await Promise.all(pokePromises);

    return pokemons.map((fulfilled) =>
        fulfilled.types.map((info) => info.type.name)
    );
};

const getPokemonsIds = (pokeApiResults) =>
    pokeApiResults.map(({ url }) => {
        const urlAsArray = url.split("/");
        return urlAsArray.at(urlAsArray.length - 2);
    });

const getPokemonsImgs = async (ids) => {
    const promises = ids.map((id) => fetch(`assets/img/${id}.png`));
    const responses = await Promise.allSettled(promises);

    const fulfilled = responses.filter(
        (response) => response.status === "fulfilled"
    );

    return fulfilled.map((response) => response.value.url);
};

const getPokemons = async (pokeApiResults) => {
    const types = await getPokemonsType(pokeApiResults);
    const ids = getPokemonsIds(pokeApiResults);
    const imgs = await getPokemonsImgs(ids);

    return pokeApiResults.map((pokemon, index) => ({
        id: ids[index],
        name: pokemon.name,
        types: types[index],
        imageUrl: imgs[index],
    }));
};

const renderPokemons = (pokemons) => {
    const ul = document.querySelector('[data-js="pokemons-list"]');
    const fragment = document.createDocumentFragment();

    pokemons.forEach(({ id, name, types, imageUrl }) => {
        const li = document.createElement("li");
        const img = document.createElement("img");
        const nameContainer = document.createElement("h2");
        const typeContainer = document.createElement("p");

        const firstType = types[0];

        img.setAttribute("src", imageUrl);
        img.setAttribute("alt", name);
        img.classList.add("card-image");

        li.setAttribute("class", `card ${firstType}`);
        li.style.setProperty("--type-color", getTypeColor(firstType));

        nameContainer.classList.add("card-title");
        nameContainer.textContent = `${id}. ${name[0].toUpperCase()}${name.slice(
            1
        )}`;

        typeContainer.classList.add("card-subtitle");
        typeContainer.textContent =
            types.length > 1 ? types.join(" | ") : firstType;

        li.append(img, nameContainer, typeContainer);
        fragment.appendChild(li);
    });

    ul.appendChild(fragment);
    totalRendered += pokemons.length;
};

const fetchNextPokemons = async () => {
    if (totalRendered >= maxPokemons) return;

    const response = await fetch(apiUrl);
    const { results, next } = await response.json();
    apiUrl = next;

    const pokemons = await getPokemons(results);

    const pokemonsToRender = pokemons.slice(0, maxPokemons - totalRendered);
    renderPokemons(pokemonsToRender);

    if (totalRendered < maxPokemons) {
        const observer = new IntersectionObserver(handleNextPokemonsRender);
        observeLastPokemon(observer);
    }
};

const handleNextPokemonsRender = (entries, observer) => {
    const entry = entries[0];

    if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        fetchNextPokemons();
    }
};

const observeLastPokemon = (observer) => {
    const lastPokemon = document.querySelector(
        '[data-js="pokemons-list"] li:last-child'
    );

    if (lastPokemon) {
        observer.observe(lastPokemon);
    }
};

const handlePageLoaded = async () => {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error("Não foi possível obter as informações.");
        }

        const { results } = await response.json();

        const pokemons = await getPokemons(results);

        const pokemonsToRender = pokemons.slice(0, maxPokemons - totalRendered);
        renderPokemons(pokemonsToRender);

        if (totalRendered < maxPokemons) {
            const observer = new IntersectionObserver(handleNextPokemonsRender);
            observeLastPokemon(observer);
        }
    } catch (error) {
        console.log("Algo deu errado: ", error);
    }
};

handlePageLoaded();
