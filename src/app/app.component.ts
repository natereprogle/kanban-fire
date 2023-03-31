import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  runTransaction,
  deleteDoc,
  updateDoc,
  addDoc,
  CollectionReference,
  collectionData,
} from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import {
  TaskDialogComponent,
  TaskDialogResult,
} from './task-dialog/task-dialog.component';
import { Task } from './task/task';
import { BehaviorSubject, Observable } from 'rxjs';

const getObservable = (collection: CollectionReference<Task>) => {
  const subject = new BehaviorSubject<Task[]>([]);

  collectionData(collection, { idField: 'id' }).forEach((doc) => {
    subject.next(doc);
  });

  return subject;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  todo = getObservable(
    collection(this.store, 'todo') as CollectionReference<Task>
  ) as Observable<Task[]>;
  inProgress = getObservable(
    collection(this.store, 'inProgress') as CollectionReference<Task>
  ) as Observable<Task[]>;
  done = getObservable(
    collection(this.store, 'done') as CollectionReference<Task>
  ) as Observable<Task[]>;

  editTask(list: 'done' | 'todo' | 'inProgress', task: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task,
        enableDelete: true,
      },
    });

    dialogRef
      .afterClosed()
      .subscribe((result: TaskDialogResult | undefined) => {
        if (!result) {
          return;
        }

        if (result.delete) {
          deleteDoc(doc(collection(this.store, list), `${task.id}`));
        } else {
          updateDoc(doc(collection(this.store, list), `${task.id}`), {
            id: task.id,
            title: task.title,
            description: task.description,
          });
        }
      });
  }

  drop(event: CdkDragDrop<Task[] | null, any, any>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const item = event.previousContainer.data[event.previousIndex] as Task;
    runTransaction(this.store, (transaction) => {
      const promise = Promise.all([
        transaction.delete(
          doc(collection(this.store, event.previousContainer.id), `${item.id}`)
        ),
        transaction.set(
          doc(collection(this.store, event.container.id), `${item.id}`),
          item
        ),
      ]);

      return promise;
    });
    transferArrayItem(
      event.previousContainer.data,
      event.container.data!,
      event.previousIndex,
      event.currentIndex
    );
  }

  constructor(private dialog: MatDialog, private store: Firestore) {}

  newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {},
      },
    });

    dialogRef
      .afterClosed()
      .subscribe((result: TaskDialogResult | undefined) => {
        if (!result) {
          return;
        }
        addDoc(collection(this.store, 'todo'), result.task);
      });
  }

  title = 'kanban-fire';
}
