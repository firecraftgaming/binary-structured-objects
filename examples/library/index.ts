function uuid() {
  return ''; // return an unique id
}

// Code above should be replaced with an actual implementation but for the sake of simplicity we'll just use a mock


// import { BinaryStructuredObjectsSchema } from 'binary-structured-objects';
import { BinaryStructuredObjectsSchema, TypeConstruct } from '../../src';

interface BookOptions {
  id?: string;
  title?: string;
  author?: string;
  pages?: number;
  bestSeller?: boolean;
  reviews?: string[];
}

class Book {
  id: string;
  title: string;
  author: string;
  pages: number;
  bestSeller: boolean;
  reviews?: string[];

  constructor(title: string, opts?: BookOptions) {
    this.id = opts?.id ?? uuid();
    this.title = title;
    this.author = opts?.author ?? 'Unknown';
    this.pages = opts?.pages ?? 0;
    this.bestSeller = opts?.bestSeller ?? false;
    if (opts.reviews) this.reviews = opts?.reviews;
  }

  addReview(review: string) {
    this.reviews = [...(this.reviews ?? []), review];
  }

  setAuthor(author: string) {
    this.author = author;
  }
  setPages(pages: number) {
    this.pages = pages;
  }
  setBestSeller(bestSeller: boolean) {
    this.bestSeller = bestSeller;
  }
}

interface LibraryOptions {
  id?: string;
  books?: Book[];
}

class Library {
  id: string;
  name: string;
  books: Book[];

  constructor(name: string, opts?: LibraryOptions) {
    this.id = opts?.id ?? uuid();
    this.name = name;
    this.books = opts?.books ?? [];
  }

  addBook(book: Book) {
    this.books = [...this.books, book];
  }
}

let libraries: Library[] = [];

const schema = new BinaryStructuredObjectsSchema('./schema.bsos');
schema.setConstructor('Library', (type: TypeConstruct) => {
  return new Library(type.values.name, {
    id: type.values.id,
    books: type.valeus.books
  });
});
schema.setConstructor('Book', (type: TypeConstruct) => {
  return new Book(type.values.title, {
    id: type.values.id,
    title: type.values.title,
    author: type.values.author,
    pages: type.values.pages,
    bestSeller: type.values.bestSeller,
    reviews: type.values.reviews
  });
});

function loadLibraries() {
  // const binary = fs.readFileSync('./libraries.blib', 'binary'); // file type doesn't matter we use 'blib' as short for 'book library'
  const binary = null;
  if (!binary) return;

  const data = schema.decode('Application', binary);
  libraries = data.libraries;
}

function saveLibraries() {
  const binary = schema.encode('Application', { libraries });
  // fs.writeFileSync('./libraries.blib', binary); // file type doesn't matter we use 'blib' as short for 'book library'

  return binary;
}