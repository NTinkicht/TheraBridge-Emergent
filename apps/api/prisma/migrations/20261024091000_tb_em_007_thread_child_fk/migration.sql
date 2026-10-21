-- AddForeignKey
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
